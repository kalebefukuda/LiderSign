import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'

export type RequestContext = {
    ip: string | null
    userAgent: string | null
}

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
