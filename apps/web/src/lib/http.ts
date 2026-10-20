import type { ApiErrorDto } from '@lidersign/shared'

/** Erro com a mensagem que a API devolveu (já em português) e o status HTTP. */
export class HttpError extends Error {
    constructor(
        public status: number,
        message: string,
        public issues?: ApiErrorDto['issues'],
    ) {
        super(message)
    }
}

const FALLBACK_BY_STATUS: Record<number, string> = {
    400: 'Algo nos dados não está certo. Confira e tente de novo.',
    401: 'Acesso não autorizado.',
    404: 'Não encontramos o que você procurava.',
    409: 'Essa ação não pode ser feita agora.',
    410: 'Este link expirou ou foi cancelado.',
    422: 'Confira os campos destacados e tente de novo.',
    429: 'Muitas tentativas seguidas. Aguarde um pouco e tente de novo.',
    502: 'Não foi possível falar com o LíderSign agora. Tente de novo em alguns segundos.',
}

export async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
    let response: Response
    try {
        response = await fetch(url, {
            ...init,
            headers: {
                Accept: 'application/json',
                ...(init.body && !(init.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
                ...(init.headers ?? {}),
            },
        })
    } catch {
        throw new HttpError(0, 'Sem conexão. Verifique a internet e tente de novo.')
    }
    if (!response.ok) {
        const body = (await response.json().catch(() => null)) as Partial<ApiErrorDto> | null
        const issues = body?.issues
        const message =
            issues?.length && response.status === 422
                ? issues.map((issue) => issue.message).join(' · ')
                : (body?.message ?? FALLBACK_BY_STATUS[response.status] ?? 'Algo deu errado. Tente de novo.')
        throw new HttpError(response.status, message, issues)
    }
    if (response.status === 204) return undefined as T
    const text = await response.text()
    return (text ? JSON.parse(text) : undefined) as T
}

export function errorMessage(error: unknown) {
    if (error instanceof HttpError) return error.message
    if (error instanceof Error) return error.message
    return 'Algo deu errado. Tente de novo.'
}
