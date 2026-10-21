import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import { AuditService } from '../audit/audit.service'
import { toEnvelopeDto } from '../common/mappers'
import { EventsService } from '../events/events.service'
import { PrismaService } from '../prisma/prisma.service'
import { WebhooksService } from '../webhooks/webhooks.service'

const SWEEP_MS = 60_000
const OPEN_STATUSES = ['SENT', 'VIEWED']

@Injectable()
export class ExpirationService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger('Expiração')
    private timer?: NodeJS.Timeout

    constructor(
        private readonly prisma: PrismaService,
        private readonly audit: AuditService,
        private readonly events: EventsService,
        private readonly webhooks: WebhooksService,
    ) {}

    onModuleInit() {
        this.timer = setInterval(() => {
            this.expireOverdue().catch((error: Error) =>
                this.logger.warn(`Falha na varredura: ${error.message}`),
            )
        }, SWEEP_MS)
        this.timer.unref()
    }

    onModuleDestroy() {
        if (this.timer) clearInterval(this.timer)
    }

    async expireOverdue(where: Prisma.EnvelopeWhereInput = {}) {
        const due = await this.prisma.envelope.findMany({
            where: { ...where, status: { in: OPEN_STATUSES }, expiresAt: { lt: new Date() } },
            include: { tenant: true },
            take: 200,
        })
        for (const envelope of due) {
            const changed = await this.prisma.envelope.updateMany({
                where: { id: envelope.id, status: { in: OPEN_STATUSES } },
                data: { status: 'EXPIRED' },
            })
            if (changed.count === 0) continue
            const expired = { ...envelope, status: 'EXPIRED' }
            await this.audit.append(envelope.id, 'ENVELOPE_EXPIRED', 'system', {})
            this.events.emit(envelope.tenantId, {
                type: 'envelope.updated',
                envelope: toEnvelopeDto(expired),
            })
            this.webhooks.dispatch(envelope.tenant, expired, 'envelope.expired')
        }
    }
}
