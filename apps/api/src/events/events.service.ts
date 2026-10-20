import { Injectable } from '@nestjs/common'
import type { StreamEvent } from '@lidersign/shared'
import { Subject } from 'rxjs'

export type TenantStreamEvent = { tenantId: string; event: StreamEvent }

/** Barramento em memória para o tempo real (SSE). Uma instância; com várias, trocar por Redis pub/sub. */
@Injectable()
export class EventsService {
    readonly stream$ = new Subject<TenantStreamEvent>()

    emit(tenantId: string, event: StreamEvent) {
        this.stream$.next({ tenantId, event })
    }
}
