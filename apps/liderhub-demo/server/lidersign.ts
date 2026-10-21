import { config } from './config.js'
import { logCall } from './call-log.js'

export class LiderSignError extends Error {
    constructor(
        public status: number,
        message: string,
    ) {
        super(message)
    }
}

type CallOptions = {
    method?: string
    body?: unknown
    tenant?: boolean
    detail?: string | null
    log?: boolean
}

function headers(tenant: boolean, json: boolean): Record<string, string> {
    return {
        Authorization: `Bearer ${config.partnerApiKey}`,
        Accept: 'application/json',
        ...(tenant ? { 'X-Tenant-Id': config.officeId } : {}),
        ...(json ? { 'Content-Type': 'application/json' } : {}),
    }
}

export async function raw(path: string, options: CallOptions = {}): Promise<Response> {
    const method = options.method ?? 'GET'
    const startedAt = Date.now()
    let response: Response
    try {
        response = await fetch(`${config.lidersignApiUrl}${path}`, {
            method,
            headers: headers(options.tenant ?? true, options.body !== undefined),
            body: options.body === undefined ? undefined : JSON.stringify(options.body),
            redirect: 'manual',
            signal: AbortSignal.timeout(20_000),
        })
    } catch {
        throw new LiderSignError(502, 'O LíderSign não respondeu. Tente de novo em instantes.')
    }
    if (options.log ?? method !== 'GET') {
        logCall({
            direction: 'liderhub-to-lidersign',
            method,
            path: path.replace(/token=[^&]+/, 'token=…'),
            status: response.status,
            ms: Date.now() - startedAt,
            detail: options.detail ?? null,
        })
    }
    return response
}

export async function call<T>(path: string, options: CallOptions = {}): Promise<T> {
    const response = await raw(path, options)
    const text = await response.text()
    const data = text ? (JSON.parse(text) as unknown) : undefined
    if (!response.ok) {
        const message =
            data && typeof data === 'object' && 'message' in data && typeof data.message === 'string'
                ? data.message
                : `O LíderSign respondeu ${response.status}`
        throw new LiderSignError(response.status, message)
    }
    return data as T
}

export const officePath = () => `/v1/partner/tenants/${encodeURIComponent(config.officeId)}`
