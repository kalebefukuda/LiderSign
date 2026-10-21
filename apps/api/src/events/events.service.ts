import { Injectable } from '@nestjs/common'
import type { StreamEvent } from '@lidersign/shared'
import { Subject } from 'rxjs'

export type TenantStreamEvent = { tenantId: string; event: StreamEvent }

@Injectable()
export class EventsService {
    readonly stream$ = new Subject<TenantStreamEvent>()

    emit(tenantId: string, event: StreamEvent) {
        this.stream$.next({ tenantId, event })
    }
}
