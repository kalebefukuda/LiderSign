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

/** Respostas da API. Datas sempre em ISO 8601 (UTC). Dados pessoais sempre mascarados. */

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
    /** Só na criação. Usado para validar o HMAC dos webhooks. */
    webhookSecret?: string
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
    /** ai: Claude via Mastra. heuristic: regras locais (sem chave de IA). */
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
    /** Só vem na criação e no reenvio (o banco guarda apenas o hash do token). Nos demais, null. */
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

/** Sessão de assinatura vista pelo signatário (GET /v1/sign/:token). */
export type SigningSessionDto = {
    title: string
    officeName: string
    status: EnvelopeStatus
    assuranceLevel: AssuranceLevel
    requiresSelfie: boolean
    /** Código no WhatsApp: só no nível Reforçado. No Padrão, o link no WhatsApp + o CPF identificam quem assina. */
    requiresOtp: boolean
    signer: { name: string; cpfMasked: string; phoneMasked: string }
    /** O signatário digitou o próprio CPF. Antes disso, o conteúdo do documento não é enviado. */
    identityConfirmed: boolean
    otpVerified: boolean
    selfieCaptured: boolean
    /** Vazio até o CPF ser confirmado. */
    plainText: string
    /** Texto do documento já preenchido, no formato dos modelos. Vazio até o CPF ser confirmado. */
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
    /** A cadeia de hashes da trilha foi recalculada e confere evento a evento. */
    trailIntact: boolean
}

export type FileCheckResponse = {
    match: boolean
    sha256: string
    verification: PublicVerificationDto | null
}

/** Payload enviado aos webhooks. Cabeçalho: X-LiderSign-Signature: t=<unix>,v1=<hmac-sha256-hex> */
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

/** Eventos ao vivo (SSE) para o painel e para o simulador de WhatsApp. */
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
