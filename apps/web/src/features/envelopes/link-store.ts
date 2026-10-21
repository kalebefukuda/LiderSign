export type StoredLink = { url: string; phone?: string }

const key = (envelopeId: string) => `lidersign:link:${envelopeId}`

export function rememberLink(envelopeId: string, url: string | null | undefined, phone?: string) {
    if (!url) return
    try {
        const previous = recallLink(envelopeId)
        const value: StoredLink = { url, phone: phone ?? previous?.phone }
        sessionStorage.setItem(key(envelopeId), JSON.stringify(value))
    } catch {}
}

export function recallLink(envelopeId: string): StoredLink | null {
    try {
        const raw = sessionStorage.getItem(key(envelopeId))
        if (!raw) return null
        const parsed = JSON.parse(raw) as StoredLink
        return typeof parsed?.url === 'string' ? parsed : null
    } catch {
        return null
    }
}

export function whatsappShareUrl(text: string, phone?: string) {
    const digits = (phone ?? '').replace(/\D/g, '')
    const target =
        digits.length >= 10 ? (digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`) : ''
    return `https://wa.me/${target}?text=${encodeURIComponent(text)}`
}
