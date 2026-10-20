/** O celular só abre o link se ele não apontar para a própria máquina. */
export function isLocalUrl(url: string) {
    try {
        const { hostname } = new URL(url)
        return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '[::1]'
    } catch {
        return false
    }
}
