import { Injectable, Logger } from '@nestjs/common'
import type { MessageDto, MessageKind, MessageStatus } from '@lidersign/shared'
import { maskPhone } from '@lidersign/shared'
import { env } from '../config/env'
import { toMessageDto } from '../common/mappers'
import { EventsService } from '../events/events.service'
import { PrismaService } from '../prisma/prisma.service'

export type OutgoingMessage = {
    tenantId: string
    envelopeId: string | null
    to: string
    kind: MessageKind
    body: string
    url?: string | null
    /**
     * Segredos que só o signatário pode ver (código de confirmação, token do link).
     * Vão para o WhatsApp, mas nunca para o banco, o painel do escritório ou o SSE.
     */
    secrets?: string[]
}

const REDACTED = '••••••'

function redact(text: string, secrets: string[]): string {
    return secrets.filter(Boolean).reduce((result, secret) => result.split(secret).join(REDACTED), text)
}

type ProviderResult = { status: MessageStatus; providerMessageId?: string; error?: string }

/** Contrato de um provedor de WhatsApp. Trocar de provedor é implementar send(). */
interface WhatsAppProvider {
    readonly name: 'simulator' | 'cloud_api'
    send(to: string, body: string): Promise<ProviderResult>
}

/** Não envia nada: a mensagem fica no banco e aparece no celular simulado da /demo. */
class SimulatorProvider implements WhatsAppProvider {
    readonly name = 'simulator' as const

    async send(): Promise<ProviderResult> {
        return { status: 'SIMULATED' }
    }
}

/** WhatsApp Cloud API oficial da Meta (número de teste serve para a demo). */
class CloudApiProvider implements WhatsAppProvider {
    readonly name = 'cloud_api' as const

    async send(to: string, body: string): Promise<ProviderResult> {
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
                    to,
                    type: 'text',
                    text: { preview_url: true, body },
                }),
                signal: AbortSignal.timeout(10_000),
            })
            const json = (await res.json().catch(() => ({}))) as {
                messages?: { id: string }[]
                error?: { message?: string; code?: number }
            }
            if (!res.ok) {
                const detail = json.error?.message ?? `HTTP ${res.status}`
                return { status: 'FAILED', error: `Meta: ${detail}`.slice(0, 500) }
            }
            return { status: 'SENT', providerMessageId: json.messages?.[0]?.id }
        } catch (error) {
            return { status: 'FAILED', error: `Falha de rede ao chamar a Meta: ${(error as Error).message}`.slice(0, 500) }
        }
    }
}

@Injectable()
export class MessagingService {
    private readonly logger = new Logger('WhatsApp')
    private readonly provider: WhatsAppProvider =
        env().WHATSAPP_PROVIDER === 'cloud_api' ? new CloudApiProvider() : new SimulatorProvider()

    /**
     * Só na demo: conteúdo completo das mensagens, em memória, para o celular simulado mostrar
     * o que o signatário veria no WhatsApp. Nunca persiste e some ao reiniciar.
     */
    private readonly demoInbox = new Map<string, { body: string; url: string | null }>()

    constructor(
        private readonly prisma: PrismaService,
        private readonly events: EventsService,
    ) {}

    get providerName() {
        return this.provider.name
    }

    /** Envia (ou simula), grava a mensagem e avisa o painel em tempo real. Nunca registra o conteúdo no log. */
    async send(message: OutgoingMessage) {
        const result = await this.provider.send(message.to, message.body)
        const secrets = message.secrets ?? []
        const saved = await this.prisma.message.create({
            data: {
                tenantId: message.tenantId,
                envelopeId: message.envelopeId,
                to: message.to,
                kind: message.kind,
                body: redact(message.body, secrets),
                url: message.url ? redact(message.url, secrets) : null,
                provider: this.provider.name,
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
        this.events.emit(message.tenantId, { type: 'message.created', message: toMessageDto(saved) })
        return saved
    }

    /** Celular simulado da demo: devolve a mensagem como o signatário a recebeu. */
    revealForDemo(message: MessageDto): MessageDto {
        const full = this.demoInbox.get(message.id)
        return full ? { ...message, body: full.body, url: full.url } : message
    }

    /** Quantos códigos já foram enviados para o envelope (limite de reenvio). */
    countSent(envelopeId: string, kind: MessageKind) {
        return this.prisma.message.count({ where: { envelopeId, kind } })
    }
}
