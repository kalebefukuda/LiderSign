import { Bell, FileSignature } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router'

import { cn, relativeTime } from '@lidersign/ui'

import { useNotifications } from '../context'

export function NotificationBell() {
    const { items, unread, markAllRead } = useNotifications()
    const [open, setOpen] = React.useState(false)
    const root = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        if (!open) return
        const onDown = (event: MouseEvent) => {
            if (!root.current?.contains(event.target as Node)) setOpen(false)
        }
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false)
        }
        document.addEventListener('mousedown', onDown)
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('mousedown', onDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [open])

    function toggle() {
        setOpen((value) => {
            if (!value) window.setTimeout(markAllRead, 1200)
            return !value
        })
    }

    return (
        <div ref={root} className="relative">
            <button
                type="button"
                onClick={toggle}
                aria-expanded={open}
                aria-label={unread ? `Notificações, ${unread} nova${unread > 1 ? 's' : ''}` : 'Notificações'}
                className="relative flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-ink"
            >
                <Bell className="size-[18px]" aria-hidden />
                {unread ? (
                    <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold leading-4 text-white tabular">
                        {unread}
                    </span>
                ) : null}
            </button>
            {open ? (
                <div
                    role="dialog"
                    aria-label="Notificações"
                    className="absolute right-0 top-11 z-40 w-[320px] overflow-hidden rounded-xl border border-line bg-white shadow-[0_8px_24px_rgba(11,18,32,0.08)] animate-pop"
                >
                    <p className="border-b border-line px-4 py-3 text-sm font-semibold">Notificações</p>
                    {items.length ? (
                        <ul className="max-h-[360px] overflow-y-auto">
                            {items.map((item) => (
                                <li key={item.id}>
                                    <Link
                                        to={`/contratos/${item.envelopeId}`}
                                        onClick={() => setOpen(false)}
                                        className={cn(
                                            'flex gap-3 border-b border-line px-4 py-3 last:border-0 hover:bg-surface/70',
                                            !item.read && 'bg-brand-soft/50',
                                        )}
                                    >
                                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                                            <FileSignature className="size-4" aria-hidden />
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-sm font-medium">{item.title}</span>
                                            <span className="block truncate text-[13px] text-muted">
                                                {item.detail}
                                            </span>
                                            <span className="block text-xs text-subtle">
                                                {relativeTime(item.at)}
                                            </span>
                                        </span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex flex-col items-center px-6 py-10 text-center">
                            <span className="flex size-10 items-center justify-center rounded-full bg-surface">
                                <Bell className="size-4 text-subtle" aria-hidden />
                            </span>
                            <p className="mt-3 text-sm font-medium">Nada por aqui ainda</p>
                            <p className="mt-1 text-[13px] text-muted">
                                Quando um cliente assinar, o aviso aparece aqui.
                            </p>
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    )
}
