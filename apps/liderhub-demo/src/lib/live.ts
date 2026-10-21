import * as React from 'react'

export type HubEvent =
    | { type: 'status' }
    | { type: 'contract.updated'; event: string | null; envelopeId: string | null }

type Listener = (event: HubEvent) => void

const listeners = new Set<Listener>()
let source: EventSource | null = null

function connect() {
    if (source || typeof EventSource === 'undefined') return
    source = new EventSource('/api/events')
    source.onmessage = (message) => {
        try {
            const parsed = JSON.parse(message.data) as HubEvent
            if (parsed && typeof parsed === 'object' && 'type' in parsed)
                listeners.forEach((fn) => fn(parsed))
        } catch {}
    }
}

export function useHubEvents(onEvent: Listener) {
    const handler = React.useRef(onEvent)
    handler.current = onEvent
    React.useEffect(() => {
        const listener: Listener = (event) => handler.current(event)
        listeners.add(listener)
        connect()
        return () => {
            listeners.delete(listener)
            if (!listeners.size) {
                source?.close()
                source = null
            }
        }
    }, [])
}
