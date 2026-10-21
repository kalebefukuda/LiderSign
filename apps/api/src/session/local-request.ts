import type { Request } from 'express'

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|[a-z0-9-]+\.localhost)$/i

/** Loopback, ou a ponte do Docker (172.16.0.0/12), que é por onde chega o acesso pelo localhost do computador. */
function localPeer(address: string | undefined) {
    const ip = (address ?? '').replace(/^::ffff:/, '')
    return ip === '127.0.0.1' || ip === '::1' || /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(ip)
}

/**
 * A entrada de demonstração (sem senha) só vale no computador onde a LíderHub roda.
 * Quem chega pelo túnel público (Cloudflare), por outro domínio ou por outra máquina da rede
 * cai na tela de acesso.
 */
export function isLocalRequest(req: Request): boolean {
    if (req.headers['cf-connecting-ip'] || req.headers['cf-ray'] || req.headers['x-forwarded-host']) {
        return false
    }
    const host = (req.headers.host ?? '').replace(/:\d+$/, '')
    // O Host vem do cliente: por isso também exige que a conexão venha desta máquina, não da rede
    return LOCAL_HOST.test(host) && localPeer(req.socket.remoteAddress)
}
