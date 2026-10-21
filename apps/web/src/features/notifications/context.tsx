import { maskName, type EnvelopeDto, type StreamEvent } from '@lidersign/shared'
import * as React from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { useLiveEvents } from '@/features/realtime'

export type AppNotification = {
    id: string
    envelopeId: string
    title: string
    detail: string
    at: string
    read: boolean
}

type NotificationsValue = {
    items: AppNotification[]
    unread: number
    markAllRead: () => void
}

const NotificationsContext = React.createContext<NotificationsValue | null>(null)
const STORE_KEY = 'liderhub:notificacoes'
const FRESH_MS = 10 * 60 * 1000

function load(): AppNotification[] {
    try {
        const raw = localStorage.getItem(STORE_KEY)
        return raw ? (JSON.parse(raw) as AppNotification[]).slice(0, 30) : []
    } catch {
        return []
    }
}

function save(items: AppNotification[]) {
    try {
        localStorage.setItem(STORE_KEY, JSON.stringify(items.slice(0, 30)))
    } catch {}
}

/** "Novo contrato assinado": sino e aviso na tela quando alguém assina, em qualquer página. */
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = React.useState<AppNotification[]>(load)
    const navigate = useNavigate()

    const known = React.useRef(new Set(items.map((item) => item.envelopeId)))

    const push = React.useCallback(
        (envelope: EnvelopeDto) => {
            const signedAt = envelope.signedAt ?? envelope.completedAt
            if (!signedAt || Date.now() - new Date(signedAt).getTime() > FRESH_MS) return
            if (known.current.has(envelope.id)) return
            known.current.add(envelope.id)
            const item: AppNotification = {
                id: `${envelope.id}:signed`,
                envelopeId: envelope.id,
                title: 'Novo contrato assinado',
                detail: `${maskName(envelope.signer.name)} · ${envelope.title}`,
                at: signedAt,
                read: false,
            }
            setItems((current) => {
                const next = [item, ...current.filter((other) => other.id !== item.id)].slice(0, 30)
                save(next)
                return next
            })
            toast.success(item.title, {
                description: item.detail,
                action: { label: 'Ver', onClick: () => navigate(`/contratos/${envelope.id}`) },
            })
        },
        [navigate],
    )

    useLiveEvents((event: StreamEvent) => {
        if (event.type !== 'envelope.updated') return
        if (event.envelope.status === 'SIGNED' || event.envelope.status === 'COMPLETED') push(event.envelope)
    })

    const markAllRead = React.useCallback(() => {
        setItems((current) => {
            if (!current.some((item) => !item.read)) return current
            const next = current.map((item) => ({ ...item, read: true }))
            save(next)
            return next
        })
    }, [])

    const value = React.useMemo(
        () => ({ items, unread: items.filter((item) => !item.read).length, markAllRead }),
        [items, markAllRead],
    )
    return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotifications() {
    const value = React.useContext(NotificationsContext)
    if (!value) throw new Error('useNotifications fora do NotificationsProvider')
    return value
}
