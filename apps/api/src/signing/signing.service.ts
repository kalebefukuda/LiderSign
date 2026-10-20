import {
    BadGatewayException,
    ConflictException,
    GoneException,
    HttpException,
    HttpStatus,
    Injectable,
    NotFoundException,
    PayloadTooLargeException,
    UnprocessableEntityException,
    UnsupportedMediaTypeException,
} from '@nestjs/common'
import type { Envelope, Prisma, Tenant } from '@prisma/client'
import {
    maskCpf,
    maskPhone,
    toPlainText,
    type AssuranceLevel,
    type CompleteSigningInput,
    type EnvelopeStatus,
    type SigningSessionDto,
} from '@lidersign/shared'
import { AuditService } from '../audit/audit.service'
import { otpCode, safeEqual, sha256Hex } from '../common/crypto'
import { toEnvelopeDto } from '../common/mappers'
import type { RequestContext } from '../common/request-context'
import { EventsService } from '../events/events.service'
import { env } from '../config/env'
import { ExpirationService } from '../envelopes/expiration.service'
import { MessagingService } from '../messaging/messaging.service'
import { otpText } from '../messaging/texts'
import { PrismaService } from '../prisma/prisma.service'
import { SealService } from '../sealing/seal.service'
import { StorageService } from '../storage/storage.service'
import { WebhooksService } from '../webhooks/webhooks.service'

const OTP_TTL_MS = 10 * 60 * 1000
const OTP_RESEND_MS = 30 * 1000
const OTP_MAX_ATTEMPTS = 5
/** Teto de códigos por envelope: 5 códigos × 5 tentativas = 25 palpites em 1 milhão de combinações. */
const OTP_MAX_SENDS = 5
const OTP_FRESH_MS = 15 * 60 * 1000
const MAX_SELFIE = 5 * 1024 * 1024
const MAX_SIGNATURE = 300 * 1024
/** Tentativas de CPF por link. Com 5 palpites, adivinhar um CPF é inviável; esgotou, o escritório gera outro link. */
const IDENTITY_MAX_ATTEMPTS = 5

/** Aceite por clique: o texto fica junto do botão "Assinar" e vai para a trilha e para a página de evidências. */
export const CONSENT_TEXT = 'Ao tocar em "Assinar", declaro que li o documento e concordo em assiná-lo eletronicamente.'

type EnvelopeWithTenant = Envelope & { tenant: Tenant }
type UploadedFile = { buffer: Buffer; size: number }

function selfieExtension(data: Buffer): 'jpg' | 'png' | 'webp' | null {
    if (data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'jpg'
    if (data.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return 'png'
    if (data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP') {
        return 'webp'
    }
    return null
}

/** Jornada do signatário. Tudo por token; nada de login. */
@Injectable()
export class SigningService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly storage: StorageService,
        private readonly audit: AuditService,
        private readonly messaging: MessagingService,
        private readonly webhooks: WebhooksService,
        private readonly events: EventsService,
        private readonly seal: SealService,
        private readonly expiration: ExpirationService,
    ) {}

    private async resolve(token: string): Promise<EnvelopeWithTenant> {
        if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) throw new NotFoundException('Link inválido. Peça um novo link ao escritório.')
        let envelope = await this.prisma.envelope.findUnique({
            where: { tokenHash: sha256Hex(token) },
            include: { tenant: true },
        })
        if (!envelope) throw new NotFoundException('Link inválido. Peça um novo link ao escritório.')
        if (['SENT', 'VIEWED'].includes(envelope.status) && envelope.expiresAt < new Date()) {
            await this.expiration.expireOverdue({ id: envelope.id })
            envelope = await this.prisma.envelope.findUniqueOrThrow({
                where: { id: envelope.id },
                include: { tenant: true },
            })
        }
        return envelope
    }

    private assertOpen(envelope: Envelope) {
        if (envelope.status === 'EXPIRED') throw new GoneException('Este link expirou. Peça um novo link ao escritório.')
        if (envelope.status === 'CANCELED') throw new GoneException('Este documento foi cancelado pelo escritório.')
        if (envelope.status === 'SIGNED' || envelope.status === 'COMPLETED') {
            throw new ConflictException('Este documento já foi assinado.')
        }
    }

    private publish(envelope: EnvelopeWithTenant) {
        this.events.emit(envelope.tenantId, { type: 'envelope.updated', envelope: toEnvelopeDto(envelope) })
    }

    private requiresOtp(envelope: Envelope) {
        return envelope.assuranceLevel === 'REFORCADO'
    }

    private assertIdentity(envelope: Envelope) {
        if (!envelope.identityVerifiedAt) throw new ConflictException('Confirme seu CPF para continuar.')
    }

    private toSession(envelope: Envelope & { tenant: Tenant }): SigningSessionDto {
        // Antes do CPF, só o necessário para a pessoa se reconhecer: o conteúdo do documento fica de fora
        const identityConfirmed = Boolean(envelope.identityVerifiedAt)
        return {
            title: envelope.title,
            officeName: envelope.tenant.name,
            status: envelope.status as EnvelopeStatus,
            assuranceLevel: envelope.assuranceLevel as AssuranceLevel,
            requiresSelfie: envelope.assuranceLevel === 'REFORCADO',
            requiresOtp: this.requiresOtp(envelope),
            identityConfirmed,
            signer: {
                // Antes do CPF, só o primeiro nome (minimização, LGPD art. 6º, III)
                name: identityConfirmed ? envelope.signerName : (envelope.signerName.trim().split(/\s+/)[0] ?? ''),
                cpfMasked: maskCpf(envelope.signerCpf),
                phoneMasked: maskPhone(envelope.signerPhone),
            },
            otpVerified: Boolean(
                envelope.otpVerifiedAt && Date.now() - envelope.otpVerifiedAt.getTime() < OTP_FRESH_MS,
            ),
            selfieCaptured: Boolean(envelope.selfiePath),
            plainText: identityConfirmed ? toPlainText(envelope.renderedBody) : '',
            body: identityConfirmed ? envelope.renderedBody : '',
            expiresAt: envelope.expiresAt.toISOString(),
            verificationCode: envelope.verificationCode,
        }
    }

    async session(token: string, ctx: RequestContext): Promise<SigningSessionDto> {
        let envelope = await this.resolve(token)
        if (envelope.status === 'EXPIRED') throw new GoneException('Este link expirou. Peça um novo link ao escritório.')
        if (envelope.status === 'CANCELED') throw new GoneException('Este documento foi cancelado pelo escritório.')
        if (envelope.status === 'SENT') {
            const updated = await this.prisma.envelope.updateMany({
                where: { id: envelope.id, status: 'SENT' },
                data: { status: 'VIEWED', viewedAt: new Date() },
            })
            if (updated.count === 1) {
                envelope = await this.prisma.envelope.findUniqueOrThrow({
                    where: { id: envelope.id },
                    include: { tenant: true },
                })
                await this.audit.append(envelope.id, 'DOCUMENT_VIEWED', 'signer', {}, ctx)
                this.webhooks.dispatch(envelope.tenant, envelope, 'envelope.viewed')
                this.publish(envelope)
            }
        }
        return this.toSession(envelope)
    }

    async document(token: string): Promise<Buffer> {
        const envelope = await this.resolve(token)
        if (envelope.status === 'EXPIRED' || envelope.status === 'CANCELED') {
            throw new GoneException('Este documento não está mais disponível.')
        }
        this.assertIdentity(envelope)
        return this.storage.get(envelope.originalPath)
    }

    /** O signatário digita o próprio CPF. Tentativas reservadas de forma atômica, como no código. */
    async confirmIdentity(token: string, cpf: string, ctx: RequestContext) {
        const envelope = await this.resolve(token)
        this.assertOpen(envelope)
        if (envelope.identityVerifiedAt) return { confirmed: true as const }
        const claimed = await this.prisma.envelope.updateMany({
            where: { id: envelope.id, identityVerifiedAt: null, identityAttempts: { lt: IDENTITY_MAX_ATTEMPTS } },
            data: { identityAttempts: { increment: 1 } },
        })
        if (claimed.count === 0) {
            throw new HttpException(
                'Muitas tentativas. Peça um novo link ao escritório pelo WhatsApp.',
                HttpStatus.TOO_MANY_REQUESTS,
            )
        }
        if (!safeEqual(sha256Hex(cpf), sha256Hex(envelope.signerCpf.replace(/\D/g, '')))) {
            const current = await this.prisma.envelope.findUnique({
                where: { id: envelope.id },
                select: { identityAttempts: true },
            })
            const attempts = current?.identityAttempts ?? IDENTITY_MAX_ATTEMPTS
            await this.audit.append(envelope.id, 'IDENTITY_FAILED', 'signer', { tentativa: attempts }, ctx)
            const left = IDENTITY_MAX_ATTEMPTS - attempts
            throw new UnprocessableEntityException(
                left > 0
                    ? `Este CPF não confere com o do documento (${left} ${left === 1 ? 'tentativa restante' : 'tentativas restantes'}).`
                    : 'Este CPF não confere. Peça um novo link ao escritório pelo WhatsApp.',
            )
        }
        await this.prisma.envelope.update({
            where: { id: envelope.id },
            data: { identityVerifiedAt: new Date() },
        })
        await this.audit.append(envelope.id, 'IDENTITY_CONFIRMED', 'signer', { cpf: maskCpf(envelope.signerCpf) }, ctx)
        return { confirmed: true as const }
    }

    async sendOtp(token: string, ctx: RequestContext) {
        const envelope = await this.resolve(token)
        this.assertOpen(envelope)
        this.assertIdentity(envelope)
        if (envelope.otpSentAt) {
            const wait = OTP_RESEND_MS - (Date.now() - envelope.otpSentAt.getTime())
            if (wait > 0) {
                throw new HttpException(
                    {
                        message: `Aguarde ${Math.ceil(wait / 1000)} segundos para pedir outro código.`,
                        retryAfterSeconds: Math.ceil(wait / 1000),
                    },
                    HttpStatus.TOO_MANY_REQUESTS,
                )
            }
        }
        if ((await this.messaging.countSent(envelope.id, 'OTP')) >= OTP_MAX_SENDS) {
            throw new HttpException(
                'Limite de códigos atingido para este documento. Peça um novo link ao escritório.',
                HttpStatus.TOO_MANY_REQUESTS,
            )
        }
        const code = otpCode()
        await this.prisma.envelope.update({
            where: { id: envelope.id },
            data: {
                otpHash: sha256Hex(`${envelope.id}${code}`),
                otpExpiresAt: new Date(Date.now() + OTP_TTL_MS),
                otpSentAt: new Date(),
                otpAttempts: 0,
            },
        })
        const message = await this.messaging.send({
            tenantId: envelope.tenantId,
            envelopeId: envelope.id,
            to: envelope.signerPhone,
            kind: 'OTP',
            body: otpText(code),
            secrets: [code],
        })
        await this.audit.append(envelope.id, 'OTP_SENT', 'system', { provider: message.provider, status: message.status }, ctx)
        if (message.status === 'FAILED') {
            throw new BadGatewayException('Não conseguimos enviar o código pelo WhatsApp. Tente de novo em instantes.')
        }
        return {
            sentTo: maskPhone(envelope.signerPhone),
            expiresInSeconds: OTP_TTL_MS / 1000,
            resendInSeconds: OTP_RESEND_MS / 1000,
            // Só na demonstração sem WhatsApp: o código vai para quem está assinando, na própria tela.
            // Com o WhatsApp ligado (ou fora da demo), ele chega apenas pelo WhatsApp.
            ...(env().DEMO_MODE && this.messaging.providerName === 'simulator' ? { demoCode: code } : {}),
        }
    }

    async verifyOtp(token: string, code: string, ctx: RequestContext) {
        const envelope = await this.resolve(token)
        this.assertOpen(envelope)
        if (!envelope.otpHash || !envelope.otpExpiresAt) {
            throw new ConflictException('Peça o código pelo WhatsApp primeiro.')
        }
        if (envelope.otpExpiresAt < new Date()) {
            throw new ConflictException('Este código expirou. Peça um novo.')
        }
        // Reserva a tentativa antes de comparar, de forma atômica: palpites em paralelo não furam o limite
        const claimed = await this.prisma.envelope.updateMany({
            where: { id: envelope.id, otpHash: envelope.otpHash, otpAttempts: { lt: OTP_MAX_ATTEMPTS } },
            data: { otpAttempts: { increment: 1 } },
        })
        if (claimed.count === 0) {
            throw new HttpException('Muitas tentativas. Peça um novo código.', HttpStatus.TOO_MANY_REQUESTS)
        }
        if (!safeEqual(sha256Hex(`${envelope.id}${code}`), envelope.otpHash)) {
            const current = await this.prisma.envelope.findUnique({
                where: { id: envelope.id },
                select: { otpAttempts: true },
            })
            const attempts = current?.otpAttempts ?? OTP_MAX_ATTEMPTS
            await this.audit.append(envelope.id, 'OTP_FAILED', 'signer', { tentativa: attempts }, ctx)
            const left = OTP_MAX_ATTEMPTS - attempts
            throw new UnprocessableEntityException(
                left > 0
                    ? `Código incorreto. Confira a mensagem no WhatsApp (${left} ${left === 1 ? 'tentativa restante' : 'tentativas restantes'}).`
                    : 'Código incorreto. Peça um novo código.',
            )
        }
        await this.prisma.envelope.update({
            where: { id: envelope.id },
            data: { otpVerifiedAt: new Date(), otpHash: null, otpExpiresAt: null, otpAttempts: 0 },
        })
        await this.audit.append(envelope.id, 'OTP_VERIFIED', 'signer', { telefone: maskPhone(envelope.signerPhone) }, ctx)
        return { verified: true as const }
    }

    async selfie(token: string, file: UploadedFile | undefined, ctx: RequestContext) {
        const envelope = await this.resolve(token)
        this.assertOpen(envelope)
        if (envelope.assuranceLevel !== 'REFORCADO') throw new ConflictException('Este documento não pede selfie.')
        this.assertIdentity(envelope)
        if (!file?.buffer?.length) throw new UnprocessableEntityException('Envie a foto no campo "selfie".')
        if (file.size > MAX_SELFIE) throw new PayloadTooLargeException('A foto pode ter no máximo 5 MB.')
        const ext = selfieExtension(file.buffer)
        if (!ext) throw new UnsupportedMediaTypeException('Envie uma foto em JPG, PNG ou WEBP.')
        const path = StorageService.envelopeKey(envelope.tenantId, envelope.id, `selfie.${ext}`)
        await this.storage.put(path, file.buffer)
        await this.prisma.envelope.update({ where: { id: envelope.id }, data: { selfiePath: path } })
        await this.audit.append(
            envelope.id,
            'SELFIE_CAPTURED',
            'signer',
            { sha256: sha256Hex(file.buffer), bytes: file.size, formato: ext },
            ctx,
        )
        return { captured: true as const }
    }

    async complete(token: string, input: CompleteSigningInput, ctx: RequestContext) {
        const envelope = await this.resolve(token)
        this.assertOpen(envelope)
        this.assertIdentity(envelope)
        const otpFresh = Boolean(
            envelope.otpVerifiedAt && Date.now() - envelope.otpVerifiedAt.getTime() <= OTP_FRESH_MS,
        )
        if (this.requiresOtp(envelope) && !otpFresh) {
            throw new ConflictException('Confirme o código do WhatsApp antes de assinar.')
        }
        if (envelope.assuranceLevel === 'REFORCADO' && !envelope.selfiePath) {
            throw new ConflictException('Tire a selfie antes de assinar.')
        }

        let signatureImagePath: string | null = null
        let typedName: string | null = null
        if (input.signature.type === 'drawn') {
            const png = Buffer.from(input.signature.imageDataUrl.split(',')[1] ?? '', 'base64')
            if (!png.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) || png.length > MAX_SIGNATURE) {
                throw new UnprocessableEntityException('Assinatura inválida. Desenhe de novo.')
            }
            signatureImagePath = StorageService.envelopeKey(envelope.tenantId, envelope.id, 'signature.png')
            await this.storage.put(signatureImagePath, png)
        } else {
            typedName = input.signature.typedName
        }

        const signedAt = new Date()
        const evidence = {
            ip: ctx.ip,
            userAgent: ctx.userAgent,
            geolocation: input.geolocation ?? null,
            identityConfirmedAt: envelope.identityVerifiedAt!.toISOString(),
            phoneVerifiedAt: otpFresh ? envelope.otpVerifiedAt!.toISOString() : null,
            consentText: CONSENT_TEXT,
            signedAt: signedAt.toISOString(),
        }
        // Atualização condicional: um clique duplo não assina duas vezes
        const updated = await this.prisma.envelope.updateMany({
            where: { id: envelope.id, status: { in: ['SENT', 'VIEWED'] } },
            data: {
                status: 'SIGNED',
                signedAt,
                signatureType: input.signature.type,
                signatureImagePath,
                typedName,
                evidence: evidence as unknown as Prisma.InputJsonValue,
            },
        })
        if (updated.count === 0) throw new ConflictException('Este documento já foi assinado.')

        await this.audit.append(envelope.id, 'CONSENT_GIVEN', 'signer', { texto: CONSENT_TEXT }, ctx)
        await this.audit.append(
            envelope.id,
            'DOCUMENT_SIGNED',
            'signer',
            { tipo: input.signature.type, geolocalizacao: Boolean(input.geolocation) },
            ctx,
        )
        const signed = await this.prisma.envelope.findUniqueOrThrow({
            where: { id: envelope.id },
            include: { tenant: true },
        })
        this.publish(signed)
        this.webhooks.dispatch(signed.tenant, signed, 'envelope.signed')
        this.seal.start(signed.id, token)
        return { status: 'SIGNED' as const, verificationCode: signed.verificationCode }
    }

    async signedCopy(token: string): Promise<{ data: Buffer; name: string }> {
        const envelope = await this.resolve(token)
        if (envelope.status !== 'COMPLETED' || !envelope.signedPath) {
            throw new ConflictException('A cópia assinada fica pronta em instantes.')
        }
        return {
            data: await this.storage.get(envelope.signedPath),
            name: `lidersign-${envelope.verificationCode}-assinado.pdf`,
        }
    }
}
