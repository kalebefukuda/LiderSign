import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'

export type RequestContext = {
    ip: string | null
    userAgent: string | null
}

/**
 * IP do cliente. Usa req.ip, que respeita o "trust proxy" do main.ts: o X-Forwarded-For só é aceito
 * quando vem de um salto local (Docker, túnel, proxy da demo). Assim ninguém forja o IP de fora.
 */
export function clientIp(req: Request): string | null {
    const ip = req.ip || req.socket?.remoteAddress || null
    return ip ? ip.replace(/^::ffff:/, '') : null
}

export function requestContext(req: Request): RequestContext {
    const ua = req.headers['user-agent']
    return {
        ip: clientIp(req),
        userAgent: typeof ua === 'string' ? ua.slice(0, 400) : null,
    }
}

export const Ctx = createParamDecorator((_: unknown, context: ExecutionContext): RequestContext => {
    return requestContext(context.switchToHttp().getRequest<Request>())
})
