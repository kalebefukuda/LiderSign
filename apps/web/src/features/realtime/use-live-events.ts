import type { StreamEvent } from '@lidersign/shared'
import * as React from 'react'

import { EVENTS_URL } from '@/lib/endpoints'

/**
 * Eventos ao vivo do LíderSign via SSE (pelo /demo-host, o back da LíderHub simulado).
 * Uma única conexão é compartilhada por todos os componentes da página.
 * Se o stream cair, `connected` vira false e as telas usam polling como reserva.
 */
type Listener = (event: StreamEvent) => void
type StatusListener = (connected: boolean) => void

const listeners = new Set<Listener>()
const statusListeners = new Set<StatusListener>()
let source: EventSource | null = null
let retryTimer: number | undefined
let attempts = 0
let connected = false

function setConnected(value: boolean) {
    connected = value
    statusListeners.forEach((listener) => listener(value))
}

function connect() {
    if (source || typeof EventSource === 'undefined') return
    source = new EventSource(EVENTS_URL)
    source.onopen = () => {
        attempts = 0
        setConnected(true)
    }
    source.onmessage = (message) => {
        try {
            const parsed = JSON.parse(message.data) as StreamEvent
            if (parsed && typeof parsed === 'object' && 'type' in parsed) listeners.forEach((listener) => listener(parsed))
        } catch {
            /* heartbeat ou payload desconhecido */
        }
    }
    source.onerror = () => {
        source?.close()
        source = null
        setConnected(false)
        if (!listeners.size) return
        attempts += 1
        window.clearTimeout(retryTimer)
        retryTimer = window.setTimeout(connect, Math.min(15000, 1000 * 2 ** attempts))
    }
}

function disconnectIfIdle() {
    if (listeners.size) return
    window.clearTimeout(retryTimer)
    source?.close()
    source = null
    setConnected(false)
}

export function useLiveEvents(onEvent: Listener, enabled = true) {
    const handlerRef = React.useRef(onEvent)
    handlerRef.current = onEvent
    const [isConnected, setIsConnected] = React.useState(connected)

    React.useEffect(() => {
        if (!enabled) return
        const listener: Listener = (event) => handlerRef.current(event)
        const statusListener: StatusListener = (value) => setIsConnected(value)
        listeners.add(listener)
        statusListeners.add(statusListener)
        setIsConnected(connected)
        connect()
        return () => {
            listeners.delete(listener)
            statusListeners.delete(statusListener)
            disconnectIfIdle()
        }
    }, [enabled])

    return { connected: enabled && isConnected }
}
