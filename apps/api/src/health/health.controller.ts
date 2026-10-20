import { Controller, Get } from '@nestjs/common'
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
    async health() {
        let db = false
        try {
            await this.prisma.$queryRaw`SELECT 1`
            db = true
        } catch {
            db = false
        }
        return {
            ok: db,
            db,
            whatsappProvider: this.messaging.providerName,
            tsa: Boolean(env().TSA_URL),
            ai: Boolean(env().ANTHROPIC_API_KEY),
        }
    }
}
