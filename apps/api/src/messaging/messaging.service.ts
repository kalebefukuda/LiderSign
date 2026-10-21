import { Injectable, Logger } from '@nestjs/common'
import type { MessageDto, MessageKind, MessagePayload, MessageStatus, MessageType } from '@lidersign/shared'
import { maskPhone } from '@lidersign/shared'
import type { Prisma } from '@prisma/client'
import { createHmac } from 'node:crypto'
import { safeEqual } from '../common/crypto'
import { env } from '../config/env'
import { publicUrl } from '../config/public-url'
import { toMessageDto } from '../common/mappers'
import { EventsService } from '../events/events.service'
import { PrismaService } from '../prisma/prisma.service'

export type OutgoingMessage = {
    tenantId: string
    envelopeId: string | null
    to: string
    kind: MessageKind
    body: string
    type?: MessageType
    payload?: MessagePayload
    url?: string | null
    secrets?: string[]
}

export type IncomingMessage = {
    tenantId: string
    envelopeId: string | null
    from: string
    type: MessageType
    body: string
    payload?: MessagePayload
    provider: 'simulator' | 'cloud_api'
    providerMessageId?: string | null
}

const REDACTED = '••••••'
const MEDIA_TTL_MS = 60 * 60 * 1000

function redact(text: string, secrets: string[]): string {
    return secrets.filter(Boolean).reduce((result, secret) => result.split(secret).join(REDACTED), text)
}

function mediaSecret() {
    return (
        env().SESSION_SECRET ??
        createHmac('sha256', env().PARTNER_API_KEY).update('lidersign:whatsapp-media').digest('hex')
    )
}

export function signMediaPath(messageId: string, now = Date.now()) {
    const exp = now + MEDIA_TTL_MS
    const sig = createHmac('sha256', mediaSecret()).update(`${messageId}.${exp}`).digest('base64url')
    return `/v1/whatsapp/media/${messageId}?exp=${exp}&sig=${sig}`
}

export function verifyMediaSignature(messageId: string, exp: string, sig: string) {
    const expires = Number(exp)
    if (!Number.isFinite(expires) || expires < Date.now()) return false
    const expected = createHmac('sha256', mediaSecret()).update(`${messageId}.${expires}`).digest('base64url')
    return safeEqual(expected, sig)
}

type ProviderResult = { status: MessageStatus; providerMessageId?: string; error?: string }

interface WhatsAppProvider {
    readonly name: 'simulator' | 'cloud_api'
    send(message: OutgoingMessage, messageId: string): Promise<ProviderResult>
}

class SimulatorProvider implements WhatsAppProvider {
    readonly name = 'simulator' as const

    async send(): Promise<ProviderResult> {
        return { status: 'SIMULATED' }
    }
}

class CloudApiProvider implements WhatsAppProvider {
    readonly name = 'cloud_api' as const

    private body(message: OutgoingMessage, messageId: string): Record<string, unknown> {
        const type = message.type ?? 'TEXT'
        if (type === 'BUTTONS' && message.payload?.buttons?.length) {
            return {
                type: 'interactive',
                interactive: {
                    type: 'button',
                    body: { text: message.body.slice(0, 1024) },
                    action: {
                        buttons: message.payload.buttons.slice(0, 3).map((button) => ({
                            type: 'reply',
                            reply: { id: button.id, title: button.title.slice(0, 20) },
                        })),
                    },
                },
            }
        }
        if (type === 'DOCUMENT' && message.payload?.document) {
            return {
                type: 'document',
                document: {
                    link: `${publicUrl()}${signMediaPath(messageId)}`,
                    filename: message.payload.document.filename,
                    caption: message.body.slice(0, 1024),
                },
            }
        }
        const text =
            type === 'AUDIO' && message.payload?.audio
                ? `Resumo do contrato: ${message.payload.audio.text}`
                : message.body
        return { type: 'text', text: { preview_url: true, body: text.slice(0, 4096) } }
    }

    async send(message: OutgoingMessage, messageId: string): Promise<ProviderResult> {
        const { WHATSAPP_API_VERSION, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN } = env()
        const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: message.to,
                    ...this.body(message, messageId),
                }),
                signal: AbortSignal.timeout(10_000),
            })
            const json = (await res.json().catch(() => ({}))) as {
                messages?: { id: string }[]
                error?: { message?: string }
            }
            if (!res.ok) {
                const detail = json.error?.message ?? `HTTP ${res.status}`
                return { status: 'FAILED', error: `Meta: ${detail}`.slice(0, 500) }
            }
            return { status: 'SENT', providerMessageId: json.messages?.[0]?.id }
        } catch (error) {
            return {
                status: 'FAILED',
                error: `Falha de rede ao chamar a Meta: ${(error as Error).message}`.slice(0, 500),
            }
        }
    }
}

@Injectable()
export class MessagingService {
    private readonly logger = new Logger('WhatsApp')
    private readonly provider: WhatsAppProvider =
        env().WHATSAPP_PROVIDER === 'cloud_api' ? new CloudApiProvider() : new SimulatorProvider()

    private readonly demoInbox = new Map<string, { body: string; url: string | null }>()

    constructor(
        private readonly prisma: PrismaService,
        private readonly events: EventsService,
    ) {}

    get providerName() {
        return this.provider.name
    }

    async send(message: OutgoingMessage) {
        const secrets = message.secrets ?? []
        const saved = await this.prisma.message.create({
            data: {
                tenantId: message.tenantId,
                envelopeId: message.envelopeId,
                to: message.to,
                direction: 'OUT',
                type: message.type ?? 'TEXT',
                payload: (message.payload ?? undefined) as Prisma.InputJsonValue | undefined,
                kind: message.kind,
                body: redact(message.body, secrets),
                url: message.url ? redact(message.url, secrets) : null,
                provider: this.provider.name,
                status: 'SIMULATED',
            },
        })
        const result = await this.provider.send(message, saved.id)
        const updated = await this.prisma.message.update({
            where: { id: saved.id },
            data: {
                status: result.status,
                providerMessageId: result.providerMessageId ?? null,
                error: result.error ?? null,
            },
        })
        if (result.status === 'FAILED') {
            this.logger.warn(`Mensagem ${message.kind} para ${maskPhone(message.to)} falhou: ${result.error}`)
        }
        if (env().DEMO_MODE) {
            this.demoInbox.set(saved.id, { body: message.body, url: message.url ?? null })
            if (this.demoInbox.size > 500) this.demoInbox.delete(this.demoInbox.keys().next().value as string)
        }
        this.events.emit(message.tenantId, { type: 'message.created', message: toMessageDto(updated) })
        return updated
    }

    async receive(message: IncomingMessage) {
        const saved = await this.prisma.message.create({
            data: {
                tenantId: message.tenantId,
                envelopeId: message.envelopeId,
                to: message.from,
                direction: 'IN',
                type: message.type,
                payload: (message.payload ?? undefined) as Prisma.InputJsonValue | undefined,
                kind: 'INBOUND',
                body: message.body.slice(0, 4_000),
                provider: message.provider,
                status: 'RECEIVED',
                providerMessageId: message.providerMessageId ?? null,
            },
        })
        this.events.emit(message.tenantId, { type: 'message.created', message: toMessageDto(saved) })
        return saved
    }

    async conversation(tenantId: string, phone: string, take = 200) {
        const messages = await this.prisma.message.findMany({
            where: { tenantId, to: phone, kind: { notIn: ['TEST'] } },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take,
        })
        return messages.reverse().map(toMessageDto)
    }

    revealForDemo(message: MessageDto): MessageDto {
        const full = this.demoInbox.get(message.id)
        return full ? { ...message, body: full.body, url: full.url } : message
    }

    countSent(envelopeId: string, kind: MessageKind) {
        return this.prisma.message.count({ where: { envelopeId, kind } })
    }
}
