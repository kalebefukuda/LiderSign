import type { CompleteSigningInput, SigningSessionDto } from '@lidersign/shared'

import { fetchJson } from '@lidersign/ui'

import { enc, SIGN_BASE } from '@/lib/endpoints'

const base = (token: string) => `${SIGN_BASE}/${enc(token)}`

export const signingApi = {
    session: (token: string) => fetchJson<SigningSessionDto>(base(token), { cache: 'no-store' }),
    confirmIdentity: (token: string, cpf: string) =>
        fetchJson<{ confirmed: true }>(`${base(token)}/identity`, {
            method: 'POST',
            body: JSON.stringify({ cpf }),
        }),
    sendOtp: (token: string) =>
        fetchJson<{
            sentTo: string
            expiresInSeconds: number
            resendInSeconds: number
            demoCode?: string
        }>(`${base(token)}/otp`, { method: 'POST' }),
    verifyOtp: (token: string, code: string) =>
        fetchJson<{ verified: true }>(`${base(token)}/otp/verify`, {
            method: 'POST',
            body: JSON.stringify({ code }),
        }),
    uploadSelfie: (token: string, file: Blob) => {
        const form = new FormData()
        form.append('selfie', file, 'selfie.jpg')
        return fetchJson<{ captured: true }>(`${base(token)}/selfie`, { method: 'POST', body: form })
    },
    complete: (token: string, input: CompleteSigningInput) =>
        fetchJson<{ status: string; verificationCode: string }>(`${base(token)}/complete`, {
            method: 'POST',
            body: JSON.stringify(input),
        }),
    documentUrl: (token: string) => `${base(token)}/document`,
    logoUrl: (token: string) => `${base(token)}/logo`,
    signedUrl: (token: string) => `${base(token)}/signed`,
}
