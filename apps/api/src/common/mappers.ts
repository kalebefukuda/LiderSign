import {
    AUDIT_EVENT_LABEL,
    maskCpf,
    maskPhone,
    type AssuranceLevel,
    type AuditEventDto,
    type AuditEventType,
    type EnvelopeDto,
    type EnvelopeStatus,
    type MessageDto,
    type MessageKind,
    type MessageStatus,
    type TemplateDto,
    type TemplateKind,
    type TemplateVariable,
    type TenantDto,
    type TimestampStatus,
    type WebhookDeliveryDto,
    type WebhookEvent,
} from '@lidersign/shared'
import type { Envelope, EnvelopeEvent, Message, Template, Tenant, WebhookDelivery } from '@prisma/client'
import { env } from '../config/env'

const iso = (date: Date | null | undefined) => (date ? date.toISOString() : null)

export function tsaName(url: string | null | undefined): string | null {
    if (!url) return null
    try {
        return new URL(url).host
    } catch {
        return url
    }
}

export function toTenantDto(tenant: Tenant): TenantDto {
    return {
        id: tenant.id,
        externalId: tenant.externalId,
        name: tenant.name,
        active: tenant.active,
        webhookUrl: tenant.webhookUrl,
        createdAt: tenant.createdAt.toISOString(),
    }
}

export function toTemplateDto(template: Template): TemplateDto {
    return {
        id: template.id,
        name: template.name,
        kind: template.kind as TemplateKind,
        assuranceLevel: template.assuranceLevel as AssuranceLevel,
        body: template.body,
        variables: (template.variables ?? []) as TemplateVariable[],
        version: template.version,
        createdAt: template.createdAt.toISOString(),
        updatedAt: template.updatedAt.toISOString(),
    }
}

export function signingUrlFor(token: string): string {
    return `${env().WEB_PUBLIC_URL}/s/${token}`
}

export function verificationUrlFor(code: string): string {
    return `${env().WEB_PUBLIC_URL}/v/${code}`
}

/** signingUrl só existe quando o token acabou de ser gerado (criação e reenvio): no banco fica só o hash. */
export function toEnvelopeDto(envelope: Envelope, signingToken?: string | null): EnvelopeDto {
    return {
        id: envelope.id,
        title: envelope.title,
        status: envelope.status as EnvelopeStatus,
        assuranceLevel: envelope.assuranceLevel as AssuranceLevel,
        templateId: envelope.templateId,
        externalRef: envelope.externalRef,
        signer: {
            name: envelope.signerName,
            cpfMasked: maskCpf(envelope.signerCpf),
            phoneMasked: maskPhone(envelope.signerPhone),
        },
        signingUrl: signingToken ? signingUrlFor(signingToken) : null,
        verificationCode: envelope.verificationCode,
        verificationUrl: verificationUrlFor(envelope.verificationCode),
        originalSha256: envelope.originalSha256,
        signedSha256: envelope.signedSha256,
        timestamp: {
            status: envelope.timestampStatus as TimestampStatus,
            genTime: iso(envelope.timestampGenTime),
            tsa: envelope.timestampTsa,
        },
        createdAt: envelope.createdAt.toISOString(),
        sentAt: iso(envelope.sentAt),
        viewedAt: iso(envelope.viewedAt),
        signedAt: iso(envelope.signedAt),
        completedAt: iso(envelope.completedAt),
        expiresAt: envelope.expiresAt.toISOString(),
    }
}

export function toAuditEventDto(event: EnvelopeEvent): AuditEventDto {
    const type = event.type as AuditEventType
    return {
        id: event.id,
        type,
        label: AUDIT_EVENT_LABEL[type] ?? type,
        actor: event.actor as AuditEventDto['actor'],
        data: (event.data ?? {}) as Record<string, unknown>,
        ip: event.ip,
        userAgent: event.userAgent,
        hash: event.hash,
        prevHash: event.prevHash,
        createdAt: event.createdAt.toISOString(),
    }
}

export function toMessageDto(message: Message): MessageDto {
    return {
        id: message.id,
        envelopeId: message.envelopeId,
        toMasked: maskPhone(message.to),
        kind: message.kind as MessageKind,
        body: message.body,
        url: message.url,
        provider: message.provider as MessageDto['provider'],
        status: message.status as MessageStatus,
        error: message.error,
        createdAt: message.createdAt.toISOString(),
    }
}

export function toWebhookDeliveryDto(delivery: WebhookDelivery): WebhookDeliveryDto {
    return {
        id: delivery.id,
        event: delivery.event as WebhookEvent,
        url: delivery.url,
        statusCode: delivery.statusCode,
        ok: delivery.ok,
        attempts: delivery.attempts,
        error: delivery.error,
        createdAt: delivery.createdAt.toISOString(),
        deliveredAt: iso(delivery.deliveredAt),
    }
}
