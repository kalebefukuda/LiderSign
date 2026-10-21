import { ArrowLeft, ArrowRight } from 'lucide-react'

import { EmptyState, cn, formatTime, useResource } from '@lidersign/ui'

import { demoApi, type CallLogEntry } from '../api'

export function CallLog() {
    const { data } = useResource<CallLogEntry[]>(demoApi.callsUrl, { refreshMs: 2000 })
    const entries = data ?? []

    if (!entries.length) {
        return (
            <EmptyState
                title="Nenhuma chamada ainda"
                description="Ligue o LíderSign acima ou envie um documento pelo painel: cada chamada aparece aqui."
            />
        )
    }

    return (
        <ol
            className="divide-y divide-line overflow-hidden rounded-2xl border border-line"
            aria-live="polite"
        >
            {entries.map((entry, index) => {
                const outgoing = entry.direction === 'liderhub-to-lidersign'
                const ok = entry.status < 400
                return (
                    <li
                        key={`${entry.at}-${index}`}
                        className="grid gap-1 px-4 py-3 sm:grid-cols-[72px_190px_1fr_auto] sm:items-center sm:gap-4"
                    >
                        <span className="text-xs text-subtle tabular">{formatTime(entry.at)}</span>
                        <span className="inline-flex items-center gap-1.5 text-[13px] text-muted">
                            {outgoing ? (
                                <>
                                    LíderHub <ArrowRight className="size-3.5" aria-label="para" /> LíderSign
                                </>
                            ) : (
                                <>
                                    LíderHub <ArrowLeft className="size-3.5" aria-label="recebeu de" />{' '}
                                    LíderSign
                                </>
                            )}
                        </span>
                        <span className="min-w-0">
                            <span className="block truncate font-mono text-[13px] text-ink">
                                {entry.method} {entry.path}
                            </span>
                            {entry.detail ? (
                                <span className="block truncate text-[13px] text-muted">{entry.detail}</span>
                            ) : null}
                        </span>
                        <span
                            className={cn(
                                'justify-self-start rounded-md px-1.5 py-0.5 font-mono text-xs tabular sm:justify-self-end',
                                ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700',
                            )}
                        >
                            {entry.status}
                            {entry.ms ? ` · ${entry.ms} ms` : ''}
                        </span>
                    </li>
                )
            })}
        </ol>
    )
}
