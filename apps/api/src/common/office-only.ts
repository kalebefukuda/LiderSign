import type { NextFunction, Request, Response } from 'express'

/**
 * O painel do escritório e o "back da LíderHub" da demo não têm login: só abrem no próprio
 * computador (ou na rede local). Pelo endereço público do túnel, só a assinatura (/s) e a
 * verificação (/v) ficam acessíveis.
 */
const OFFICE_PATHS = /^\/(painel|liderhub|desenvolvedores|demo)(\/|$)/
const DEMO_HOST = /^\/demo-host(\/|$)/

const PRIVATE_HOST =
    /^(localhost|127(?:\.\d{1,3}){3}|\[::1\]|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}|[a-z0-9-]+)$/i

/** Usa o Host cru (não o X-Forwarded-Host, que o cliente controla) e recusa tudo que passou pela Cloudflare. */
export function isOfficeRequest(req: Request): boolean {
    if (req.headers['cf-ray'] || req.headers['cf-connecting-ip']) return false
    const host = (req.headers.host ?? '').replace(/:\d+$/, '')
    return PRIVATE_HOST.test(host)
}

export function officeOnly(req: Request, res: Response, next: NextFunction) {
    if (isOfficeRequest(req)) return next()
    if (DEMO_HOST.test(req.path)) {
        res.status(404).json({ statusCode: 404, message: 'Não encontrado' })
        return
    }
    if (OFFICE_PATHS.test(req.path) || req.path === '/') {
        // Quem chega pelo link público é cliente: a página dele é a de verificação
        res.redirect(302, '/v')
        return
    }
    next()
}
