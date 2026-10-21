import type { EnvelopeDto } from '@lidersign/shared'

import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/format'

export function EnvelopeProgress({ envelope, className }: { envelope: EnvelopeDto; className?: string }) {
    const steps = [
        { label: 'Enviado', at: envelope.sentAt ?? envelope.createdAt },
        { label: 'Visto', at: envelope.viewedAt },
        { label: 'Assinado', at: envelope.completedAt ?? envelope.signedAt },
    ]
    const sealing = envelope.status === 'SIGNED'
    return (
        <ol className={cn('flex items-center gap-2', className)} aria-label="Andamento">
            {steps.map((step, index) => {
                const done = Boolean(step.at)
                return (
                    <li key={step.label} className="flex min-w-0 items-center gap-2">
                        {index > 0 ? (
                            <span
                                aria-hidden
                                className={cn('h-px w-4 sm:w-6', done ? 'bg-brand/50' : 'bg-line-strong')}
                            />
                        ) : null}
                        <span
                            aria-hidden
                            className={cn(
                                'size-2 shrink-0 rounded-full',
                                done ? 'bg-brand' : 'border border-line-strong bg-white',
                                index === 2 && sealing && 'animate-pulse bg-brand/60',
                            )}
                        />
                        <span className={cn('truncate text-xs', done ? 'text-ink' : 'text-subtle')}>
                            {step.label}
                            {step.at ? (
                                <span className="ml-1 text-subtle tabular">{formatTime(step.at)}</span>
                            ) : null}
                            {index === 2 && sealing ? (
                                <span className="ml-1 text-subtle">selando…</span>
                            ) : null}
                        </span>
                        <span className="sr-only">{done ? 'concluído' : 'pendente'}</span>
                    </li>
                )
            })}
        </ol>
    )
}
