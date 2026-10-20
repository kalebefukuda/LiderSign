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

export function AuditTrail({ events, className }: { events: AuditEventDto[]; className?: string }) {
    const ordered = [...events].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    return (
        <ol className={cn('relative', className)}>
            {ordered.map((event, index) => (
                <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
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
                            <Badge tone={event.actor === 'signer' ? 'brand' : 'neutral'}>{ACTOR_LABEL[event.actor]}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted tabular">{formatDateTimeLong(event.createdAt)}</p>
                        {event.ip ? <p className="mt-0.5 text-xs text-subtle tabular">IP {event.ip}</p> : null}
                        <div className="mt-1.5 flex items-center gap-1 text-xs text-subtle">
                            <span className="font-mono">hash {shortHash(event.hash, 16)}</span>
                            <CopyButton value={event.hash} label="Copiar hash" />
                        </div>
                    </div>
                </li>
            ))}
        </ol>
    )
}
