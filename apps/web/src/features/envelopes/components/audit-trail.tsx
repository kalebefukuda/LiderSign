import type { AuditEventDto } from '@lidersign/shared'

import { Badge } from '@/components/ui/badge'
import { CopyButton } from '@/components/ui/states'
import { cn } from '@/lib/cn'
import { formatDateTimeLong, shortHash } from '@/lib/format'

const ACTOR_LABEL: Record<AuditEventDto['actor'], string> = {
    system: 'Sistema',
    signer: 'Signatário',
    partner: 'LíderHub',
}

/** Histórico do envelope. Com `technical`, mostra também IP e o hash encadeado de cada evento. */
export function AuditTrail({
    events,
    className,
    technical = false,
}: {
    events: AuditEventDto[]
    className?: string
    technical?: boolean
}) {
    const ordered = [...events].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    return (
        <ol className={cn('relative', className)}>
            {ordered.map((event, index) => (
                <li key={event.id} className={cn('relative flex gap-4 last:pb-0', technical ? 'pb-6' : 'pb-5')}>
                    {index < ordered.length - 1 ? (
                        <span aria-hidden className="absolute left-[5px] top-4 h-full w-px bg-line" />
                    ) : null}
                    <span
                        aria-hidden
                        className={cn(
                            'relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 bg-white',
                            event.actor === 'signer' ? 'border-brand' : 'border-line-strong',
                        )}
                    />
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <p className="font-medium text-ink">{event.label}</p>
                            {technical ? (
                                <Badge tone={event.actor === 'signer' ? 'brand' : 'neutral'}>{ACTOR_LABEL[event.actor]}</Badge>
                            ) : null}
                        </div>
                        <p className="mt-1 text-sm text-muted tabular">{formatDateTimeLong(event.createdAt)}</p>
                        {technical && event.ip ? <p className="mt-0.5 text-xs text-subtle tabular">IP {event.ip}</p> : null}
                        {technical ? (
                            <div className="mt-1.5 flex items-center gap-1 text-xs text-subtle">
                                <span className="font-mono">hash {shortHash(event.hash, 16)}</span>
                                <CopyButton value={event.hash} label="Copiar hash" />
                            </div>
                        ) : null}
                    </div>
                </li>
            ))}
        </ol>
    )
}
