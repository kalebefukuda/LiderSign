import { Controller, MessageEvent, Sse, UseGuards } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import type { Tenant } from '@prisma/client'
import { filter, interval, map, merge, Observable } from 'rxjs'
import { CurrentTenant, TenantGuard } from '../common/partner.guard'
import { EventsService } from './events.service'

@Controller('v1/events')
@UseGuards(TenantGuard)
@SkipThrottle()
export class EventsController {
    constructor(private readonly events: EventsService) {}

    @Sse()
    stream(@CurrentTenant() tenant: Tenant): Observable<MessageEvent> {
        const updates = this.events.stream$.pipe(
            filter((item) => item.tenantId === tenant.id),
            map((item) => ({ data: item.event }) as MessageEvent),
        )
        const heartbeat = interval(15_000).pipe(map(() => ({ type: 'ping', data: {} }) as MessageEvent))
        return merge(updates, heartbeat)
    }
}
