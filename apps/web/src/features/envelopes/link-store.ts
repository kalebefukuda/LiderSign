/**
 * O link de assinatura só existe no momento do envio (no banco fica apenas o hash do token).
 * Guardamos na sessão desta aba para o painel mostrar o QR code; fechou a aba, gera-se um novo link.
 */
const key = (envelopeId: string) => `lidersign:link:${envelopeId}`

export function rememberLink(envelopeId: string, url: string | null) {
    if (!url) return
    try {
        sessionStorage.setItem(key(envelopeId), url)
    } catch {
        // navegador sem sessionStorage: o painel oferece gerar um novo link
    }
}

export function recallLink(envelopeId: string): string | null {
    try {
        return sessionStorage.getItem(key(envelopeId))
    } catch {
        return null
    }
}
