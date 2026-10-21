/** O celular só abre o link se ele não apontar para a própria máquina. */
export function isLocalUrl(url: string) {
    try {
        const { hostname } = new URL(url)
        return (
            hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname === '0.0.0.0' ||
            hostname === '[::1]'
        )
    } catch {
        return false
    }
}

const PRIVATE_HOST =
    /^(localhost|127(?:\.\d{1,3}){3}|\[::1\]|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|[a-z0-9-]+)$/i

/**
 * Estamos no computador do escritório (ou na rede local)? Pelo endereço público do túnel, quem chega
 * é o cliente: nada de painel nem links para ele. O servidor também bloqueia essas rotas.
 */
export function isOfficeHost(hostname = window.location.hostname) {
    return PRIVATE_HOST.test(hostname)
}
