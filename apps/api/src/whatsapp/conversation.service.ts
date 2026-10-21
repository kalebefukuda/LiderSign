import { Injectable, Logger, type OnModuleInit } from '@nestjs/common'
import { maskCpf, onlyDigits, WHATSAPP_BUTTONS } from '@lidersign/shared'
import type { Envelope, Tenant } from '@prisma/client'
import { AuditService } from '../audit/audit.service'
import { randomToken, sha256Hex } from '../common/crypto'
import { signingUrlFor, toEnvelopeDto } from '../common/mappers'
import { EventsService } from '../events/events.service'
import { ExpirationService } from '../envelopes/expiration.service'
import { MessagingService, type OutgoingMessage } from '../messaging/messaging.service'
import { PrismaService } from '../prisma/prisma.service'
import { SealService } from '../sealing/seal.service'
import { SigningService, WHATSAPP_CONTEXT } from '../signing/signing.service'
import { ContractExplainerService } from './contract-explainer.service'
import { BUTTON_TITLES, conversationText } from './texts'

export const CONVERSATION_STATES = [
    'AWAITING_CPF',
    'AWAITING_DECISION',
    'AWAITING_QUESTION',
    'AWAITING_SELFIE',
    'SIGNED',
    'DONE',
    'BLOCKED',
] as const
export type ConversationState = (typeof CONVERSATION_STATES)[number]

export type Inbound =
    | { type: 'text'; text: string }
    | { type: 'button'; buttonId: string; title?: string }
    | { type: 'image'; data: Buffer; caption?: string | null }

export type InboundMeta = { provider: 'simulator' | 'cloud_api'; providerMessageId?: string | null }

const OPEN = ['SENT', 'VIEWED']
const WORDS_PER_SECOND = 2.6

const CPF_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g

/** O CPF digitado na conversa não fica gravado por inteiro (LGPD art. 6º, III). */
function maskCpfs(text: string) {
    return text.replace(CPF_PATTERN, (match) => maskCpf(match))
}

function samePhone(a: string, b: string) {
    // A Meta às vezes devolve celular brasileiro sem o nono dígito: compara DDD + 8 finais
    const x = onlyDigits(a)
    const y = onlyDigits(b)
    if (x === y) return true
    return x.length >= 12 && y.length >= 12 && x.slice(2, 4) === y.slice(2, 4) && x.slice(-8) === y.slice(-8)
}

/**
 * Conversa de assinatura no WhatsApp. Uma máquina de estados por envelope:
 * AWAITING_CPF → AWAITING_DECISION (⇄ AWAITING_QUESTION) → [AWAITING_SELFIE] → SIGNED → DONE.
 * O mesmo código atende o simulador da demonstração e o webhook da Meta.
 */
@Injectable()
export class ConversationService implements OnModuleInit {
    private readonly logger = new Logger('Conversa')
    private readonly locks = new Map<string, Promise<unknown>>()

    constructor(
        private readonly prisma: PrismaService,
        private readonly messaging: MessagingService,
        private readonly signing: SigningService,
        private readonly explainer: ContractExplainerService,
        private readonly audit: AuditService,
        private readonly events: EventsService,
        private readonly expiration: ExpirationService,
        private readonly seal: SealService,
    ) {}

    onModuleInit() {
        this.seal.onWhatsAppCompleted((envelope, verifyUrl) => this.deliverSignedCopy(envelope, verifyUrl))
    }

    /** Mensagens do mesmo envelope são tratadas uma de cada vez, na ordem de chegada. */
    private serialize<T>(key: string, task: () => Promise<T>): Promise<T> {
        const previous = this.locks.get(key) ?? Promise.resolve()
        const next = previous.catch(() => undefined).then(task)
        this.locks.set(key, next)
        void next.finally(() => {
            if (this.locks.get(key) === next) this.locks.delete(key)
        })
        return next
    }

    private say(
        envelope: Envelope,
        message: Omit<OutgoingMessage, 'tenantId' | 'envelopeId' | 'to' | 'kind'> & {
            kind?: OutgoingMessage['kind']
        },
    ) {
        return this.messaging.send({
            tenantId: envelope.tenantId,
            envelopeId: envelope.id,
            to: envelope.signerPhone,
            kind: message.kind ?? 'CONVERSATION',
            ...message,
        })
    }

    private async setState(envelope: Envelope, state: ConversationState) {
        await this.prisma.envelope.update({ where: { id: envelope.id }, data: { conversationState: state } })
        envelope.conversationState = state
    }

    private publish(envelope: Envelope) {
        this.events.emit(envelope.tenantId, { type: 'envelope.updated', envelope: toEnvelopeDto(envelope) })
    }

    async start(tenant: Tenant, envelope: Envelope) {
        await this.prisma.envelope.update({
            where: { id: envelope.id },
            data: { channel: 'WHATSAPP', conversationState: 'AWAITING_CPF', sentAt: new Date() },
        })
        const greeting = await this.say(envelope, {
            body: conversationText.greeting(envelope.signerName, tenant.name, envelope.title),
        })
        await this.say(envelope, { body: conversationText.askCpf() })
        await this.audit.append(envelope.id, 'WHATSAPP_STARTED', 'system', {
            provider: greeting.provider,
            status: greeting.status,
        })
        return this.prisma.envelope.findUniqueOrThrow({ where: { id: envelope.id } })
    }

    /** Envelope aberto mais recente com este telefone, no canal WhatsApp. */
    async findActive(tenantId: string | null, phone: string) {
        const candidates = await this.prisma.envelope.findMany({
            where: {
                ...(tenantId ? { tenantId } : {}),
                channel: 'WHATSAPP',
                status: { in: [...OPEN, 'SIGNED', 'COMPLETED'] },
            },
            include: { tenant: true },
            orderBy: { createdAt: 'desc' },
            take: 100,
        })
        return candidates.find((item) => samePhone(item.signerPhone, phone)) ?? null
    }

    async handleInbound(tenantId: string | null, phone: string, input: Inbound, meta: InboundMeta) {
        // A Meta reenvia o mesmo webhook se não recebe 200 a tempo: cada mensagem conta uma vez só
        if (meta.providerMessageId) {
            const seen = await this.prisma.message.findFirst({
                where: {
                    provider: meta.provider,
                    providerMessageId: meta.providerMessageId,
                    direction: 'IN',
                },
                select: { id: true },
            })
            if (seen) return { handled: false as const }
        }
        const found = await this.findActive(tenantId, phone)
        if (!found) {
            if (tenantId) await this.storeInbound(tenantId, null, phone, input, meta)
            return { handled: false as const }
        }
        return this.serialize(found.id, async () => {
            await this.expiration.expireOverdue({ id: found.id })
            const envelope = await this.prisma.envelope.findUniqueOrThrow({
                where: { id: found.id },
                include: { tenant: true },
            })
            const stored = await this.storeInbound(envelope.tenantId, envelope.id, phone, input, meta)
            if (envelope.status === 'SENT') {
                // Na conversa, "abriu" é a primeira resposta do cliente
                await this.signing.markViewed(envelope.id, WHATSAPP_CONTEXT, {
                    canal: 'whatsapp',
                    primeira_resposta: true,
                })
                envelope.status = 'VIEWED'
            }
            await this.react(envelope, input, stored.id, meta.provider)
            return { handled: true as const, envelopeId: envelope.id }
        })
    }

    private storeInbound(
        tenantId: string,
        envelopeId: string | null,
        phone: string,
        input: Inbound,
        meta: InboundMeta,
    ) {
        const body =
            input.type === 'text'
                ? maskCpfs(input.text)
                : input.type === 'button'
                  ? (input.title ??
                    BUTTON_TITLES[input.buttonId as keyof typeof BUTTON_TITLES] ??
                    input.buttonId)
                  : (input.caption ?? 'Foto')
        return this.messaging.receive({
            tenantId,
            envelopeId,
            from: phone,
            type: input.type === 'text' ? 'TEXT' : input.type === 'button' ? 'BUTTONS' : 'IMAGE',
            body,
            payload: input.type === 'image' ? { image: { caption: input.caption ?? null } } : undefined,
            provider: meta.provider,
            providerMessageId: meta.providerMessageId ?? null,
        })
    }

    private async react(
        envelope: Envelope & { tenant: Tenant },
        input: Inbound,
        inboundId: string,
        provider: InboundMeta['provider'],
    ) {
        if (envelope.status === 'EXPIRED') {
            await this.say(envelope, { body: conversationText.expired() })
            return
        }
        if (envelope.status === 'CANCELED') return
        if (envelope.status === 'SIGNED' || envelope.status === 'COMPLETED') {
            await this.say(envelope, { body: conversationText.alreadySigned() })
            return
        }

        const state = (envelope.conversationState ?? 'AWAITING_CPF') as ConversationState
        switch (state) {
            case 'AWAITING_CPF':
                return this.onCpf(envelope, input)
            case 'AWAITING_DECISION':
            case 'AWAITING_QUESTION':
                return this.onDecision(envelope, input, inboundId, state, provider)
            case 'AWAITING_SELFIE':
                return this.onSelfie(envelope, input, inboundId, provider)
            case 'BLOCKED':
                await this.say(envelope, { body: conversationText.blockedAgain() })
                return
            default:
                await this.say(envelope, { body: conversationText.alreadySigned() })
        }
    }

    private async onCpf(envelope: Envelope & { tenant: Tenant }, input: Inbound) {
        const digits = input.type === 'text' ? onlyDigits(input.text) : ''
        if (digits.length !== 11) {
            await this.say(envelope, { body: conversationText.cpfInvalid() })
            return
        }
        const result = await this.signing.checkIdentity(envelope, digits, WHATSAPP_CONTEXT, 'whatsapp')
        if (result.status === 'ok') {
            await this.sendDocument(envelope)
            return
        }
        if (result.status === 'wrong' && result.left > 0) {
            await this.say(envelope, { body: conversationText.cpfWrong(result.left) })
            return
        }
        await this.setState(envelope, 'BLOCKED')
        await this.say(envelope, { body: conversationText.blocked() })
        this.publish(envelope)
    }

    private async sendDocument(envelope: Envelope & { tenant: Tenant }) {
        await this.setState(envelope, 'AWAITING_DECISION')
        const filename = `${envelope.title
            .replace(/[^\p{L}\p{N} ._-]+/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim()}.pdf`
        await this.say(envelope, {
            type: 'DOCUMENT',
            body: conversationText.documentCaption(),
            payload: { document: { filename, file: 'original' } },
        })
        const summary = await this.explainer.summary(envelope, envelope.tenant.name)
        await this.say(envelope, {
            type: 'AUDIO',
            body: conversationText.audioCaption(),
            payload: {
                audio: {
                    text: summary,
                    seconds: Math.max(8, Math.round(summary.split(/\s+/).length / WORDS_PER_SECOND)),
                },
            },
        })
        await this.sendButtons(envelope, conversationText.decision())
        this.publish(await this.prisma.envelope.findUniqueOrThrow({ where: { id: envelope.id } }))
    }

    private sendButtons(envelope: Envelope, body: string) {
        return this.say(envelope, {
            type: 'BUTTONS',
            body,
            payload: {
                buttons: [
                    { id: WHATSAPP_BUTTONS.SIGN, title: BUTTON_TITLES.sign },
                    { id: WHATSAPP_BUTTONS.QUESTION, title: BUTTON_TITLES.question },
                    { id: WHATSAPP_BUTTONS.BROWSER, title: BUTTON_TITLES.browser },
                ],
            },
        })
    }

    private async onDecision(
        envelope: Envelope & { tenant: Tenant },
        input: Inbound,
        inboundId: string,
        state: ConversationState,
        provider: InboundMeta['provider'],
    ) {
        if (input.type === 'button') {
            if (input.buttonId === WHATSAPP_BUTTONS.SIGN) {
                if (envelope.assuranceLevel === 'REFORCADO' && !envelope.selfiePath) {
                    await this.setState(envelope, 'AWAITING_SELFIE')
                    await this.say(envelope, { body: conversationText.askSelfie() })
                    return
                }
                await this.finish(envelope, inboundId, provider)
                return
            }
            if (input.buttonId === WHATSAPP_BUTTONS.QUESTION) {
                await this.setState(envelope, 'AWAITING_QUESTION')
                await this.say(envelope, { body: conversationText.askQuestion() })
                return
            }
            if (input.buttonId === WHATSAPP_BUTTONS.BROWSER) {
                await this.sendBrowserLink(envelope)
                return
            }
        }
        if (input.type === 'image') {
            await this.say(envelope, { body: conversationText.useButton() })
            return
        }
        if (input.type === 'text') {
            if (
                state === 'AWAITING_DECISION' &&
                /^\s*(assinar|assino|sim|aceito|concordo|ok)\s*[.!]*\s*$/i.test(input.text)
            ) {
                // O aceite fica no botão, para a evidência ser inequívoca
                await this.sendButtons(envelope, conversationText.useButton())
                return
            }
            const answer = await this.explainer.answer(envelope, envelope.tenant.name, input.text)
            await this.audit.append(
                envelope.id,
                'WHATSAPP_REPLY',
                'signer',
                { tipo: 'duvida' },
                WHATSAPP_CONTEXT,
            )
            await this.setState(envelope, 'AWAITING_DECISION')
            await this.say(envelope, { body: answer })
            await this.sendButtons(envelope, conversationText.decisionAgain())
        }
    }

    private async onSelfie(
        envelope: Envelope & { tenant: Tenant },
        input: Inbound,
        inboundId: string,
        provider: InboundMeta['provider'],
    ) {
        if (input.type !== 'image') {
            await this.say(envelope, { body: conversationText.askSelfieAgain() })
            return
        }
        try {
            await this.signing.storeSelfie(envelope, input.data, WHATSAPP_CONTEXT)
        } catch {
            await this.say(envelope, { body: conversationText.selfieInvalid() })
            return
        }
        const fresh = await this.prisma.envelope.findUniqueOrThrow({
            where: { id: envelope.id },
            include: { tenant: true },
        })
        await this.finish(fresh, inboundId, provider)
    }

    private async finish(
        envelope: Envelope & { tenant: Tenant },
        inboundId: string,
        provider: InboundMeta['provider'],
    ) {
        await this.signing.completeFromWhatsApp(envelope.id, {
            messageId: inboundId,
            phone: envelope.signerPhone,
            provider,
        })
        await this.setState(envelope, 'SIGNED')
        await this.say(envelope, { body: conversationText.signed(envelope.signerName) })
    }

    async sendBrowserLink(envelope: Envelope) {
        const token = randomToken(32)
        await this.prisma.envelope.update({
            where: { id: envelope.id },
            data: { tokenHash: sha256Hex(token) },
        })
        const url = signingUrlFor(token)
        const message = await this.say(envelope, {
            kind: 'SIGNING_LINK',
            body: conversationText.browserLink(url),
            url,
            secrets: [token],
        })
        await this.audit.append(envelope.id, 'LINK_SENT', 'system', {
            provider: message.provider,
            status: message.status,
            pedido: 'whatsapp',
        })
    }

    /** Lembrete na própria conversa, de acordo com a etapa em que a pessoa parou. */
    async nudge(envelope: Envelope) {
        const state = (envelope.conversationState ?? 'AWAITING_CPF') as ConversationState
        let message
        if (state === 'AWAITING_CPF') {
            message = await this.say(envelope, {
                kind: 'REMINDER',
                body: conversationText.nudge.AWAITING_CPF(envelope.signerName),
            })
        } else if (state === 'AWAITING_SELFIE') {
            message = await this.say(envelope, {
                kind: 'REMINDER',
                body: conversationText.nudge.AWAITING_SELFIE(envelope.signerName),
            })
        } else if (state === 'AWAITING_DECISION' || state === 'AWAITING_QUESTION') {
            if (state === 'AWAITING_QUESTION') await this.setState(envelope, 'AWAITING_DECISION')
            message = await this.say(envelope, {
                kind: 'REMINDER',
                type: 'BUTTONS',
                body: conversationText.nudge.AWAITING_DECISION(envelope.signerName),
                payload: {
                    buttons: [
                        { id: WHATSAPP_BUTTONS.SIGN, title: BUTTON_TITLES.sign },
                        { id: WHATSAPP_BUTTONS.QUESTION, title: BUTTON_TITLES.question },
                        { id: WHATSAPP_BUTTONS.BROWSER, title: BUTTON_TITLES.browser },
                    ],
                },
            })
        } else {
            return null
        }
        await this.audit.append(envelope.id, 'REMINDER_SENT', 'system', {
            provider: message.provider,
            status: message.status,
            canal: 'whatsapp',
            etapa: state,
        })
        return message
    }

    /** Depois da selagem: manda a via assinada e o código de verificação na conversa. */
    async deliverSignedCopy(envelope: Envelope, verifyUrl: string) {
        const filename = `${envelope.title
            .replace(/[^\p{L}\p{N} ._-]+/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim()} assinado.pdf`
        const copy = await this.say(envelope, {
            kind: 'SIGNED_COPY',
            type: 'DOCUMENT',
            body: conversationText.signedCopyCaption(),
            payload: { document: { filename, file: 'signed' } },
        })
        await this.say(envelope, {
            kind: 'SIGNED_COPY',
            body: conversationText.signedCopy(envelope.verificationCode, verifyUrl),
            url: verifyUrl,
        })
        await this.prisma.envelope.update({ where: { id: envelope.id }, data: { conversationState: 'DONE' } })
        this.logger.log(`Via assinada enviada na conversa de ${envelope.id}`)
        return copy
    }
}
