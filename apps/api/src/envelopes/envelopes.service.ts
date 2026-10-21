import {
    ConflictException,
    Injectable,
    NotFoundException,
    UnprocessableEntityException,
} from '@nestjs/common'
import { Prisma, type Envelope, type Tenant } from '@prisma/client'
import {
    maskCpf,
    ENVELOPE_STATUSES,
    fillTemplate,
    missingVariables,
    type CreateEnvelopeInput,
    type EnvelopeDetailDto,
    type EnvelopeStatus,
} from '@lidersign/shared'
import { randomUUID } from 'node:crypto'
import { AuditService } from '../audit/audit.service'
import { randomToken, sha256Hex, verificationCode } from '../common/crypto'
import {
    signingUrlFor,
    toAuditEventDto,
    toEnvelopeDto,
    toMessageDto,
    toWebhookDeliveryDto,
} from '../common/mappers'
import type { RequestContext } from '../common/request-context'
import { EventsService } from '../events/events.service'
import { ExpirationService } from './expiration.service'
import { MessagingService } from '../messaging/messaging.service'
import { signingLinkText } from '../messaging/texts'
import { PrismaService } from '../prisma/prisma.service'
import { PdfRenderService, roleForKind } from '../sealing/pdf-render.service'
import { StorageService } from '../storage/storage.service'
import { TemplatesService } from '../templates/templates.service'
import { WebhooksService } from '../webhooks/webhooks.service'

const VALIDITY_DAYS = 7
type ParsedCreateEnvelope = Omit<CreateEnvelopeInput, 'variables' | 'send' | 'signer'> & {
    variables: Record<string, string>
    send: boolean
    signer: { name: string; cpf: string; phone: string; email?: string }
}

@Injectable()
export class EnvelopesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly templates: TemplatesService,
        private readonly pdf: PdfRenderService,
        private readonly storage: StorageService,
        private readonly audit: AuditService,
        private readonly messaging: MessagingService,
        private readonly webhooks: WebhooksService,
        private readonly events: EventsService,
        private readonly expiration: ExpirationService,
    ) {}

    expireOverdue(where: Prisma.EnvelopeWhereInput = {}) {
        return this.expiration.expireOverdue(where)
    }

    private async uniqueCode(): Promise<string> {
        for (let i = 0; i < 6; i++) {
            const code = verificationCode()
            const exists = await this.prisma.envelope.findUnique({ where: { verificationCode: code } })
            if (!exists) return code
        }
        throw new Error('Não foi possível gerar um código de verificação único')
    }

    async create(tenant: Tenant, input: ParsedCreateEnvelope, ctx: RequestContext) {
        const template = await this.templates.findOwned(tenant, input.templateId)
        if (template.archived) throw new NotFoundException('Modelo arquivado')

        const values = Object.fromEntries(
            Object.entries(input.variables).map(([key, value]) => [key, value.trim()]),
        )
        const missing = missingVariables(template.body, values)
        if (missing.length) {
            throw new UnprocessableEntityException({
                message: `Preencha os campos: ${missing.join(', ')}`,
                issues: missing.map((key) => ({ path: `variables.${key}`, message: 'Campo obrigatório' })),
            })
        }

        const renderedBody = fillTemplate(template.body, values)
        const original = await this.pdf.renderDocument({
            title: template.name,
            officeName: tenant.name,
            body: renderedBody,
            signer: {
                name: input.signer.name,
                cpfMasked: maskCpf(input.signer.cpf),
                role: roleForKind(template.kind),
            },
        })
        const originalSha256 = sha256Hex(original)
        const id = randomUUID()
        const originalPath = StorageService.envelopeKey(tenant.id, id, 'original.pdf')
        await this.storage.put(originalPath, original)

        const token = randomToken(32)
        const envelope = await this.prisma.envelope.create({
            data: {
                id,
                tenantId: tenant.id,
                templateId: template.id,
                templateVersion: template.version,
                title: template.name,
                status: 'SENT',
                assuranceLevel: template.assuranceLevel,
                variables: values as Prisma.InputJsonValue,
                renderedBody,
                externalRef: input.externalRef ?? null,
                signerName: input.signer.name,
                signerCpf: input.signer.cpf,
                signerPhone: input.signer.phone,
                signerEmail: input.signer.email ?? null,
                tokenHash: sha256Hex(token),
                verificationCode: await this.uniqueCode(),
                originalPath,
                originalSha256,
                expiresAt: new Date(Date.now() + VALIDITY_DAYS * 24 * 60 * 60 * 1000),
            },
        })

        await this.audit.append(
            envelope.id,
            'ENVELOPE_CREATED',
            'partner',
            { templateId: template.id, templateVersion: template.version, externalRef: envelope.externalRef },
            ctx,
        )
        await this.audit.append(envelope.id, 'DOCUMENT_GENERATED', 'system', { sha256: originalSha256 })

        const final = input.send ? await this.sendLink(tenant, envelope, token, false) : envelope
        this.events.emit(tenant.id, { type: 'envelope.updated', envelope: toEnvelopeDto(final) })
        this.webhooks.dispatch(tenant, final, 'envelope.sent')
        return toEnvelopeDto(final, token)
    }

    private async sendLink(tenant: Tenant, envelope: Envelope, token: string, resend: boolean) {
        const url = signingUrlFor(token)
        const message = await this.messaging.send({
            tenantId: tenant.id,
            envelopeId: envelope.id,
            to: envelope.signerPhone,
            kind: 'SIGNING_LINK',
            body: signingLinkText(envelope.signerName, tenant.name, envelope.title, url),
            url,
            secrets: [token],
        })
        await this.audit.append(envelope.id, 'LINK_SENT', 'system', {
            provider: message.provider,
            status: message.status,
            ...(resend ? { reenvio: true } : {}),
        })
        return this.prisma.envelope.update({ where: { id: envelope.id }, data: { sentAt: new Date() } })
    }

    async list(tenant: Tenant, status?: string) {
        await this.expireOverdue({ tenantId: tenant.id })
        const filter =
            status && (ENVELOPE_STATUSES as readonly string[]).includes(status) ? { status } : undefined
        const envelopes = await this.prisma.envelope.findMany({
            where: { tenantId: tenant.id, ...filter },
            orderBy: { createdAt: 'desc' },
            take: 100,
        })
        return envelopes.map((envelope) => toEnvelopeDto(envelope))
    }

    async findOwned(tenant: Tenant, id: string) {
        const envelope = await this.prisma.envelope.findFirst({ where: { id, tenantId: tenant.id } })
        if (!envelope) throw new NotFoundException('Envelope não encontrado')
        return envelope
    }

    async detail(tenant: Tenant, id: string): Promise<EnvelopeDetailDto> {
        await this.expireOverdue({ id, tenantId: tenant.id })
        const envelope = await this.prisma.envelope.findFirst({
            where: { id, tenantId: tenant.id },
            include: {
                events: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
                messages: { orderBy: { createdAt: 'asc' } },
                deliveries: { orderBy: { createdAt: 'asc' } },
            },
        })
        if (!envelope) throw new NotFoundException('Envelope não encontrado')
        return {
            ...toEnvelopeDto(envelope),
            events: envelope.events.map(toAuditEventDto),
            messages: envelope.messages.map(toMessageDto),
            webhookDeliveries: envelope.deliveries.map(toWebhookDeliveryDto),
        }
    }

    async resend(tenant: Tenant, id: string) {
        await this.expireOverdue({ id, tenantId: tenant.id })
        const envelope = await this.findOwned(tenant, id)
        if (!['SENT', 'VIEWED'].includes(envelope.status)) {
            throw new ConflictException('Só dá para reenviar documentos que ainda não foram assinados')
        }
        const token = randomToken(32)
        const rotated = await this.prisma.envelope.update({
            where: { id },
            data: { tokenHash: sha256Hex(token) },
        })
        const final = await this.sendLink(tenant, rotated, token, true)
        this.events.emit(tenant.id, { type: 'envelope.updated', envelope: toEnvelopeDto(final) })
        return toEnvelopeDto(final, token)
    }

    async cancel(tenant: Tenant, id: string, ctx: RequestContext) {
        const envelope = await this.findOwned(tenant, id)
        if (!['SENT', 'VIEWED'].includes(envelope.status)) {
            throw new ConflictException(
                'Documentos assinados, expirados ou já cancelados não podem ser cancelados',
            )
        }
        // Guarda de estado atômica: se o signatário assinou no mesmo instante, a assinatura vence
        const changed = await this.prisma.envelope.updateMany({
            where: { id, status: { in: ['SENT', 'VIEWED'] } },
            data: { status: 'CANCELED', canceledAt: new Date() },
        })
        if (changed.count === 0) {
            throw new ConflictException('O documento acabou de mudar de estado e não pode mais ser cancelado')
        }
        const canceled = await this.prisma.envelope.findUniqueOrThrow({ where: { id } })
        await this.audit.append(id, 'ENVELOPE_CANCELED', 'partner', {}, ctx)
        this.events.emit(tenant.id, { type: 'envelope.updated', envelope: toEnvelopeDto(canceled) })
        this.webhooks.dispatch(tenant, canceled, 'envelope.canceled')
        return toEnvelopeDto(canceled)
    }

    async file(
        tenant: Tenant,
        id: string,
        kind: string,
    ): Promise<{ data: Buffer; type: string; name: string }> {
        const envelope = await this.findOwned(tenant, id)
        const base = `lidersign-${envelope.verificationCode}`
        if (kind === 'original') {
            return {
                data: await this.storage.get(envelope.originalPath),
                type: 'application/pdf',
                name: `${base}-original.pdf`,
            }
        }
        if (kind === 'signed') {
            if (envelope.status !== ('COMPLETED' satisfies EnvelopeStatus) || !envelope.signedPath) {
                throw new ConflictException('O PDF selado fica disponível quando a assinatura é concluída')
            }
            return {
                data: await this.storage.get(envelope.signedPath),
                type: 'application/pdf',
                name: `${base}-assinado.pdf`,
            }
        }
        if (kind === 'timestamp') {
            if (!envelope.timestampToken)
                throw new ConflictException('Este documento não tem carimbo do tempo emitido')
            return {
                data: Buffer.from(envelope.timestampToken),
                type: 'application/timestamp-reply',
                name: `${base}-carimbo.tsr`,
            }
        }
        throw new NotFoundException('Arquivo não encontrado')
    }
}
