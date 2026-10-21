import { Controller, Get, Query, Req, Res } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { OFFICE_PATH_PATTERN } from '@lidersign/shared'
import type { Request, Response } from 'express'
import { readSession, redeemLoginToken, setSessionCookie } from './session'

@Controller('entrar')
export class OfficeLoginController {
    @Get()
    @Throttle({ default: { limit: 30, ttl: 60_000 } })
    enter(
        @Query('token') token: unknown,
        @Query('to') to: unknown,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        const target = typeof to === 'string' && OFFICE_PATH_PATTERN.test(to) ? to : '/painel'
        const tenantId = typeof token === 'string' && token.length <= 64 ? redeemLoginToken(token) : null
        res.setHeader('Cache-Control', 'no-store')
        if (!tenantId) {
            res.redirect(302, readSession(req) ? target : '/painel?acesso=expirado')
            return
        }
        setSessionCookie(req, res, tenantId)
        res.redirect(302, target)
    }
}
