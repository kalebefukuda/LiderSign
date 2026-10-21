import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { EnvelopesService } from './envelopes.service'

const SWEEP_MS = 5 * 60_000
const MIN_HOURS = 24
const HOUR_MS = 60 * 60 * 1000

@Injectable()
export class ReminderService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger('Lembretes')
    private timer?: NodeJS.Timeout

    constructor(
        private readonly prisma: PrismaService,
        private readonly envelopes: EnvelopesService,
    ) {}

    onModuleInit() {
        this.timer = setInterval(() => {
            this.sweep().catch((error: Error) => this.logger.warn(`Falha na varredura: ${error.message}`))
        }, SWEEP_MS)
        this.timer.unref()
    }

    onModuleDestroy() {
        if (this.timer) clearInterval(this.timer)
    }

    async sweep(now = new Date()) {
        const due = await this.prisma.envelope.findMany({
            where: {
                status: { in: ['SENT', 'VIEWED'] },
                remindedAt: null,
                expiresAt: { gt: now },
                sentAt: { lt: new Date(now.getTime() - MIN_HOURS * HOUR_MS) },
                tenant: { active: true, reminderEnabled: true },
            },
            include: { tenant: true },
            orderBy: { sentAt: 'asc' },
            take: 50,
        })
        for (const envelope of due) {
            const waited = now.getTime() - (envelope.sentAt?.getTime() ?? now.getTime())
            if (waited < envelope.tenant.reminderAfterHours * HOUR_MS) continue
            await this.envelopes.remind(envelope.tenant, envelope)
        }
    }
}
