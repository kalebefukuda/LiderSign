import type {
    ApiErrorDto,
    CreateEnvelopeInput,
    EnvelopeDetailDto,
    EnvelopeDto,
    TemplateDto,
} from '@lidersign/shared'

/**
 * Cliente HTTP mínimo da API do LíderSign, usado pelas ferramentas do MCP.
 * Autentica como parceiro (LíderHub) e age em nome de um escritório (X-Tenant-Id).
 * As credenciais vêm só do ambiente: o modelo nunca escolhe nem vê a chave.
 */

export class LiderSignApiError extends Error {
    constructor(
        message: string,
        readonly statusCode: number,
        readonly issues: { path: string; message: string }[] = [],
    ) {
        super(message)
        this.name = 'LiderSignApiError'
    }
}

export type LiderSignClientConfig = {
    apiUrl: string
    partnerKey: string
    tenantId: string
    timeoutMs?: number
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): LiderSignClientConfig {
    const apiUrl = env.LIDERSIGN_API_URL?.trim()
    const partnerKey = (env.LIDERSIGN_PARTNER_KEY ?? env.PARTNER_API_KEY)?.trim()
    const tenantId = env.LIDERSIGN_TENANT_ID?.trim()
    const missing = [
        !apiUrl && 'LIDERSIGN_API_URL',
        !partnerKey && 'PARTNER_API_KEY (ou LIDERSIGN_PARTNER_KEY)',
        !tenantId && 'LIDERSIGN_TENANT_ID',
    ].filter(Boolean)
    if (missing.length) {
        throw new Error(
            `Configuração do LíderSign incompleta. Defina as variáveis de ambiente: ${missing.join(', ')}.`,
        )
    }
    return { apiUrl: normalizeApiUrl(apiUrl!), partnerKey: partnerKey!, tenantId: tenantId! }
}

/**
 * Aceita a base com ou sem /v1: http://localhost:4000, http://localhost:3000/v1 ou .../v1/.
 * As rotas do cliente já incluem /v1, então a base fica sempre sem ele.
 */
export function normalizeApiUrl(value: string): string {
    return value.trim().replace(/\/+$/, '').replace(/\/v1$/i, '')
}

export class LiderSignClient {
    private readonly config: LiderSignClientConfig

    constructor(config?: LiderSignClientConfig) {
        const resolved = config ?? configFromEnv()
        this.config = { ...resolved, apiUrl: normalizeApiUrl(resolved.apiUrl) }
    }

    listTemplates(signal?: AbortSignal): Promise<TemplateDto[]> {
        return this.request<TemplateDto[]>('GET', '/v1/templates', undefined, signal)
    }

    getTemplate(id: string, signal?: AbortSignal): Promise<TemplateDto> {
        return this.request<TemplateDto>('GET', `/v1/templates/${encodeURIComponent(id)}`, undefined, signal)
    }

    createEnvelope(input: CreateEnvelopeInput, signal?: AbortSignal): Promise<EnvelopeDto> {
        return this.request<EnvelopeDto>('POST', '/v1/envelopes', input, signal)
    }

    getEnvelope(id: string, signal?: AbortSignal): Promise<EnvelopeDetailDto> {
        return this.request<EnvelopeDetailDto>(
            'GET',
            `/v1/envelopes/${encodeURIComponent(id)}`,
            undefined,
            signal,
        )
    }

    private async request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
        const timeout = AbortSignal.timeout(this.config.timeoutMs ?? 20_000)
        const combined = signal ? AbortSignal.any([signal, timeout]) : timeout
        let response: Response
        try {
            response = await fetch(`${this.config.apiUrl}${path}`, {
                method,
                headers: {
                    Authorization: `Bearer ${this.config.partnerKey}`,
                    'X-Tenant-Id': this.config.tenantId,
                    Accept: 'application/json',
                    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
                },
                body: body !== undefined ? JSON.stringify(body) : undefined,
                signal: combined,
            })
        } catch (error) {
            const reason = error instanceof Error ? error.message : String(error)
            throw new LiderSignApiError(
                `Não consegui falar com a API do LíderSign em ${this.config.apiUrl} (${reason}). Ela está no ar?`,
                0,
            )
        }

        const text = await response.text()
        const data = text ? safeJson(text) : undefined
        if (!response.ok) {
            const err = (data ?? {}) as Partial<ApiErrorDto>
            throw new LiderSignApiError(
                describeError(response.status, err.message),
                response.status,
                err.issues ?? [],
            )
        }
        return data as T
    }
}

function safeJson(text: string): unknown {
    try {
        return JSON.parse(text)
    } catch {
        return { message: text.slice(0, 300) }
    }
}

function describeError(status: number, message?: string): string {
    const detail = message ? ` ${message}` : ''
    switch (status) {
        case 401:
            return `Chave de parceiro recusada pela API.${detail}`
        case 403:
            return `Acesso negado para este escritório.${detail}`
        case 404:
            return `Não encontrado.${detail} Confira o id informado ou se o LíderSign foi ativado para o escritório.`
        case 409:
            return `O documento não está no estado esperado.${detail}`
        case 410:
            return `O documento expirou ou foi cancelado.${detail}`
        case 422:
            return `Dados inválidos.${detail}`
        case 429:
            return `Muitas requisições em pouco tempo. Tente de novo em instantes.${detail}`
        default:
            return `A API respondeu com erro ${status}.${detail}`
    }
}
