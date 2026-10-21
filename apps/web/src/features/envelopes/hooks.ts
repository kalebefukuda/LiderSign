import type { EnvelopeDto, StreamEvent } from '@lidersign/shared'
import * as React from 'react'

import { useResource } from '@lidersign/ui'

import { useLiveEvents } from '@/features/realtime'

import { envelopesApi } from './api'

export function useEnvelopes(enabled = true) {
    const [connectedOnce, setConnectedOnce] = React.useState(false)
    const resource = useResource<EnvelopeDto[]>(enabled ? envelopesApi.listUrl : null, {
        refreshMs: connectedOnce ? 15000 : 3000,
    })
    const { setData, reload } = resource

    const { connected } = useLiveEvents((event: StreamEvent) => {
        if (event.type !== 'envelope.updated') return
        setData((current) => {
            if (!current) return current
            const exists = current.some((item) => item.id === event.envelope.id)
            if (!exists) return [event.envelope, ...current]
            return current.map((item) =>
                item.id === event.envelope.id ? { ...event.envelope, signingUrl: item.signingUrl } : item,
            )
        })
    }, enabled)

    React.useEffect(() => {
        if (connected) setConnectedOnce(true)
        else setConnectedOnce(false)
    }, [connected])

    return { ...resource, reload, live: connected }
}
