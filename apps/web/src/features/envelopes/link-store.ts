/**
 * O link de assinatura só existe no momento do envio (no banco fica apenas o hash do token).
 * Guardamos na sessão desta aba, junto do celular digitado no envio, para o painel oferecer
 * "Enviar pelo WhatsApp" e o QR code. Fechou a aba, some; dá para gerar um novo link.
 */
export type StoredLink = { url: string; phone?: string }

const key = (envelopeId: string) => `lidersign:link:${envelopeId}`

export function rememberLink(envelopeId: string, url: string | null | undefined, phone?: string) {
    if (!url) return
    try {
        const previous = recallLink(envelopeId)
        const value: StoredLink = { url, phone: phone ?? previous?.phone }
        sessionStorage.setItem(key(envelopeId), JSON.stringify(value))
    } catch {
        // navegador sem sessionStorage: o painel oferece gerar um novo link
    }
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

/** Link wa.me: abre o WhatsApp de quem está no painel com a mensagem pronta. Sem celular, a pessoa escolhe o contato. */
export function whatsappShareUrl(text: string, phone?: string) {
    const digits = (phone ?? '').replace(/\D/g, '')
    const target =
        digits.length >= 10 ? (digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`) : ''
    return `https://wa.me/${target}?text=${encodeURIComponent(text)}`
}
