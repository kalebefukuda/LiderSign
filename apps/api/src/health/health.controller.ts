import { Controller, Get, Res } from '@nestjs/common'
import type { Response } from 'express'
import { SkipThrottle } from '@nestjs/throttler'
import { env } from '../config/env'
import { MessagingService } from '../messaging/messaging.service'
import { PrismaService } from '../prisma/prisma.service'

@Controller('health')
@SkipThrottle()
export class HealthController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly messaging: MessagingService,
    ) {}

    @Get()
    async health(@Res({ passthrough: true }) res: Response) {
        let db = false
        try {
            await this.prisma.$queryRaw`SELECT 1`
            db = true
        } catch {
            db = false
        }
        // 503 sem banco: o healthcheck do Docker e o CI percebem a falha
        if (!db) res.status(503)
        return {
            ok: db,
            db,
            whatsappProvider: this.messaging.providerName,
            tsa: Boolean(env().TSA_URL),
            ai: Boolean(env().ANTHROPIC_API_KEY),
        }
    }
}
