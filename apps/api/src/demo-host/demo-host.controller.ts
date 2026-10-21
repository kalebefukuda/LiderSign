import { BadGatewayException, Body, Controller, Get, Headers, HttpCode, Post, Req, Res } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import type { Request, Response } from 'express'
import { listCalls } from './call-log'
import { DemoHostService } from './demo-host.service'

@Controller('demo-host')
@SkipThrottle()
export class DemoHostController {
    constructor(private readonly host: DemoHostService) {}

    @Get('status')
    status() {
        return this.host.status()
    }

    @Post('activate')
    async activate(@Res({ passthrough: true }) res: Response) {
        try {
            const result = await this.host.activate()
            res.status(result.created ? 201 : 200)
            return result
        } catch {
            throw new BadGatewayException('Não foi possível ativar o LíderSign agora. Tente de novo.')
        }
    }

    @Post('deactivate')
    @HttpCode(204)
    async deactivate() {
        try {
            await this.host.deactivate()
        } catch {
            throw new BadGatewayException('Não foi possível desativar o LíderSign agora. Tente de novo.')
        }
    }

    @Post('webhook')
    @HttpCode(200)
    async webhook(@Req() req: Request, @Headers('x-lidersign-signature') signature?: string) {
        const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body ?? {}))
        const item = await this.host.receive(raw, signature)
        return { received: true, verified: item.verified }
    }

    @Get('webhooks')
    webhooks() {
        return this.host.list()
    }

    @Get('calls')
    calls() {
        return listCalls()
    }

    @Post('whatsapp-test')
    @HttpCode(200)
    whatsappTest(@Body() body: { phone?: unknown }) {
        return this.host.whatsappTest(typeof body?.phone === 'string' ? body.phone : '')
    }
}
