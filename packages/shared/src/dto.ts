import type {
    AssuranceLevel,
    AuditEventType,
    EnvelopeStatus,
    MessageKind,
    MessageStatus,
    TemplateKind,
    TimestampStatus,
    WebhookEvent,
} from './enums'
import type { TemplateVariable } from './schemas'

export type TenantDto = {
    id: string
    externalId: string
    name: string
    active: boolean
    webhookUrl: string | null
    createdAt: string
}

export type ConnectTenantResponse = {
    tenant: TenantDto
    created: boolean
    webhookSecret?: string
}

export type OfficeSessionResponse = {
    path: string
    expiresAt: string
}

export type OfficeMeDto = {
    tenant: TenantDto
    templatesCount: number
    whatsappProvider: 'simulator' | 'cloud_api'
    whatsappConfigured: boolean
    webPublicUrl: string
    tunnel: boolean
    partner: { name: string; url: string | null }
}

export type TemplateDto = {
    id: string
    name: string
    kind: TemplateKind
    assuranceLevel: AssuranceLevel
    body: string
    variables: TemplateVariable[]
    version: number
    createdAt: string
    updatedAt: string
}

export type TemplateImportResponse = {
    suggestedName: string
    kind: TemplateKind
    body: string
    variables: TemplateVariable[]
    engine: 'ai' | 'heuristic'
    warnings: string[]
}

export type SignerDto = {
    name: string
    cpfMasked: string
    phoneMasked: string
}

export type TimestampDto = {
    status: TimestampStatus
    genTime: string | null
    tsa: string | null
}

export type EnvelopeDto = {
    id: string
    title: string
    status: EnvelopeStatus
    assuranceLevel: AssuranceLevel
    templateId: string
    externalRef: string | null
    signer: SignerDto
    signingUrl: string | null
    verificationCode: string
    verificationUrl: string
    originalSha256: string
    signedSha256: string | null
    timestamp: TimestampDto
    createdAt: string
    sentAt: string | null
    viewedAt: string | null
    signedAt: string | null
    completedAt: string | null
    expiresAt: string
}

export type AuditEventDto = {
    id: string
    type: AuditEventType
    label: string
    actor: 'system' | 'signer' | 'partner'
    data: Record<string, unknown>
    ip: string | null
    userAgent: string | null
    hash: string
    prevHash: string | null
    createdAt: string
}

export type MessageDto = {
    id: string
    envelopeId: string | null
    toMasked: string
    kind: MessageKind
    body: string
    url: string | null
    provider: 'simulator' | 'cloud_api'
    status: MessageStatus
    error: string | null
    createdAt: string
}

export type WebhookDeliveryDto = {
    id: string
    event: WebhookEvent
    url: string
    statusCode: number | null
    ok: boolean
    attempts: number
    error: string | null
    createdAt: string
    deliveredAt: string | null
}

export type EnvelopeDetailDto = EnvelopeDto & {
    events: AuditEventDto[]
    messages: MessageDto[]
    webhookDeliveries: WebhookDeliveryDto[]
}

export type SigningSessionDto = {
    title: string
    officeName: string
    status: EnvelopeStatus
    assuranceLevel: AssuranceLevel
    requiresSelfie: boolean
    requiresOtp: boolean
    signer: { name: string; cpfMasked: string; phoneMasked: string }
    identityConfirmed: boolean
    otpVerified: boolean
    selfieCaptured: boolean
    plainText: string
    body: string
    expiresAt: string
    verificationCode: string
}

export type PublicVerificationDto = {
    valid: boolean
    code: string
    title: string
    officeName: string
    status: EnvelopeStatus
    assuranceLevel: AssuranceLevel
    signer: { nameMasked: string; cpfMasked: string; cpfConfirmed: boolean; phoneVerified: boolean }
    signedAt: string | null
    completedAt: string | null
    originalSha256: string
    signedSha256: string | null
    timestamp: TimestampDto
    trail: { label: string; at: string }[]
    trailIntact: boolean
}

export type FileCheckResponse = {
    match: boolean
    sha256: string
    verification: PublicVerificationDto | null
}

export type WebhookPayload = {
    id: string
    event: WebhookEvent
    createdAt: string
    data: {
        envelopeId: string
        externalRef: string | null
        status: EnvelopeStatus
        verificationUrl: string
    }
}

export type StreamEvent =
    | { type: 'envelope.updated'; envelope: EnvelopeDto }
    | { type: 'message.created'; message: MessageDto }
    | { type: 'webhook.delivered'; envelopeId: string | null; delivery: WebhookDeliveryDto }

export type ApiErrorDto = {
    statusCode: number
    error: string
    message: string
    issues?: { path: string; message: string }[]
}
