import type {
    AssuranceLevel,
    AuditEventType,
    EnvelopeStatus,
    MessageKind,
    MessageStatus,
    MessageType,
    SigningChannel,
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

export type OfficeSettingsDto = {
    brandColor: string | null
    hasLogo: boolean
    linkValidityDays: number
    reminderEnabled: boolean
    reminderAfterHours: number
}

export type OfficeMeDto = {
    tenant: TenantDto
    settings: OfficeSettingsDto
    templatesCount: number
    whatsappProvider: 'simulator' | 'cloud_api'
    whatsappConfigured: boolean
    webPublicUrl: string
    tunnel: boolean
    demo: boolean
    aiEnabled: boolean
}

export type SessionInfoDto = {
    loginAvailable: boolean
    officeName: string
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
    channel: SigningChannel
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
    identityConfirmedAt: string | null
    remindedAt: string | null
    signedAt: string | null
    completedAt: string | null
    expiresAt: string
}

export type ContactDto = {
    id: string
    name: string
    initials: string
    cpfMasked: string
    phoneMasked: string
    city: string
    topic: string
    stage: string
    lastMessage: { body: string; direction: 'IN' | 'OUT'; createdAt: string } | null
    contract: EnvelopeDto | null
}

export type ConversationDto = {
    contact: ContactDto
    messages: MessageDto[]
}

export type ImportedContractDto = {
    id: string
    provider: 'zapsign'
    title: string
    signerName: string
    status: 'SENT' | 'VIEWED' | 'SIGNED' | 'EXPIRED'
    sentAt: string
    viewedAt: string | null
    signedAt: string | null
}

export type AssistantAction =
    | { type: 'template.created'; templateId: string; name: string }
    | { type: 'contracts.nudged'; count: number }
    | { type: 'navigate'; to: string; label: string }

export type AssistantReply = {
    reply: string
    actions: AssistantAction[]
    engine: 'ai' | 'scripted'
    thoughtMs: number
    lookups: number
    steps: string[]
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

export type MessagePayload = {
    author?: 'agent' | 'team'
    buttons?: { id: string; title: string }[]
    document?: { filename: string; file: 'original' | 'signed' }
    audio?: { text: string; seconds: number }
    image?: { caption: string | null }
}

export type MessageDto = {
    id: string
    envelopeId: string | null
    toMasked: string
    direction: 'OUT' | 'IN'
    type: MessageType
    payload: MessagePayload | null
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
    envelopeId: string | null
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
    branding: { color: string | null; hasLogo: boolean }
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
    | { type: 'contacts.updated' }

export type ApiErrorDto = {
    statusCode: number
    error: string
    message: string
    issues?: { path: string; message: string }[]
}
