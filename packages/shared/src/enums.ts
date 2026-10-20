export const ENVELOPE_STATUSES = ['SENT', 'VIEWED', 'SIGNED', 'COMPLETED', 'CANCELED', 'EXPIRED'] as const
export type EnvelopeStatus = (typeof ENVELOPE_STATUSES)[number]

export const ENVELOPE_STATUS_LABEL: Record<EnvelopeStatus, string> = {
    SENT: 'Enviado',
    VIEWED: 'Visto',
    SIGNED: 'Selando',
    COMPLETED: 'Assinado',
    CANCELED: 'Cancelado',
    EXPIRED: 'Expirado',
}

/**
 * Nível de garantia escolhido no modelo, nunca a cada envio.
 * PADRAO: código no WhatsApp + IP, dispositivo e geolocalização consentida.
 * REFORCADO: PADRAO + selfie do signatário (procurações e litígio de massa).
 */
export const ASSURANCE_LEVELS = ['PADRAO', 'REFORCADO'] as const
export type AssuranceLevel = (typeof ASSURANCE_LEVELS)[number]

export const ASSURANCE_LEVEL_LABEL: Record<AssuranceLevel, string> = {
    PADRAO: 'Padrão',
    REFORCADO: 'Reforçado',
}

export const TEMPLATE_KINDS = ['CONTRATO', 'PROCURACAO', 'DECLARACAO', 'OUTRO'] as const
export type TemplateKind = (typeof TEMPLATE_KINDS)[number]

export const TEMPLATE_KIND_LABEL: Record<TemplateKind, string> = {
    CONTRATO: 'Contrato',
    PROCURACAO: 'Procuração',
    DECLARACAO: 'Declaração',
    OUTRO: 'Outro',
}

export const VARIABLE_TYPES = [
    'text',
    'cpf',
    'cnpj',
    'date',
    'money',
    'phone',
    'email',
    'address',
    'number',
] as const
export type VariableType = (typeof VARIABLE_TYPES)[number]

export const MESSAGE_KINDS = ['SIGNING_LINK', 'OTP', 'SIGNED_COPY', 'REMINDER'] as const
export type MessageKind = (typeof MESSAGE_KINDS)[number]

export const MESSAGE_STATUSES = ['SIMULATED', 'SENT', 'FAILED'] as const
export type MessageStatus = (typeof MESSAGE_STATUSES)[number]

export const TIMESTAMP_STATUSES = ['OK', 'PENDING', 'FAILED', 'SKIPPED'] as const
export type TimestampStatus = (typeof TIMESTAMP_STATUSES)[number]

export const WEBHOOK_EVENTS = [
    'envelope.sent',
    'envelope.viewed',
    'envelope.signed',
    'envelope.completed',
    'envelope.canceled',
    'envelope.expired',
] as const
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

/** Tipos de evento gravados na trilha de auditoria (append-only, hash encadeado). */
export const AUDIT_EVENT_TYPES = [
    'ENVELOPE_CREATED',
    'DOCUMENT_GENERATED',
    'LINK_SENT',
    'DOCUMENT_VIEWED',
    'OTP_SENT',
    'OTP_FAILED',
    'OTP_VERIFIED',
    'SELFIE_CAPTURED',
    'CONSENT_GIVEN',
    'DOCUMENT_SIGNED',
    'TIMESTAMP_ISSUED',
    'TIMESTAMP_FAILED',
    'DOCUMENT_SEALED',
    'COPY_SENT',
    'ENVELOPE_CANCELED',
    'ENVELOPE_EXPIRED',
] as const
export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number]

export const AUDIT_EVENT_LABEL: Record<AuditEventType, string> = {
    ENVELOPE_CREATED: 'Envelope criado',
    DOCUMENT_GENERATED: 'Documento gerado',
    LINK_SENT: 'Link enviado pelo WhatsApp',
    DOCUMENT_VIEWED: 'Documento aberto pelo signatário',
    OTP_SENT: 'Código enviado pelo WhatsApp',
    OTP_FAILED: 'Código incorreto informado',
    OTP_VERIFIED: 'Telefone confirmado pelo código',
    SELFIE_CAPTURED: 'Selfie registrada',
    CONSENT_GIVEN: 'Aceite dos termos registrado',
    DOCUMENT_SIGNED: 'Documento assinado',
    TIMESTAMP_ISSUED: 'Carimbo do tempo emitido',
    TIMESTAMP_FAILED: 'Carimbo do tempo indisponível',
    DOCUMENT_SEALED: 'PDF selado (PAdES)',
    COPY_SENT: 'Cópia enviada ao signatário',
    ENVELOPE_CANCELED: 'Envelope cancelado',
    ENVELOPE_EXPIRED: 'Link expirado sem assinatura',
}
