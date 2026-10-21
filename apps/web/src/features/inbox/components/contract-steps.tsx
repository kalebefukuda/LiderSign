import type { EnvelopeDto } from '@lidersign/shared'
import { Check } from 'lucide-react'

import { cn, formatTime } from '@lidersign/ui'

export function contractSteps(envelope: EnvelopeDto) {
    return [
        { label: 'Recebeu na conversa', at: envelope.sentAt ?? envelope.createdAt },
        { label: envelope.channel === 'WHATSAPP' ? 'Respondeu' : 'Abriu o link', at: envelope.viewedAt },
        { label: 'Confirmou o CPF', at: envelope.identityConfirmedAt },
        { label: 'Assinou', at: envelope.signedAt },
        { label: 'PDF selado e carimbado', at: envelope.completedAt },
    ]
}

export function ContractSteps({ envelope }: { envelope: EnvelopeDto }) {
    const steps = contractSteps(envelope)
    const stopped = envelope.status === 'CANCELED' || envelope.status === 'EXPIRED'
    const current = steps.findIndex((step) => !step.at)
    return (
        <ol className="space-y-2.5">
            {steps.map((step, index) => (
                <li key={step.label} className="flex items-center gap-2.5 text-sm">
                    <span
                        className={cn(
                            'flex size-5 shrink-0 items-center justify-center rounded-full',
                            step.at
                                ? 'bg-emerald-100 text-emerald-700'
                                : index === current && !stopped
                                  ? 'border-2 border-brand/40'
                                  : 'border border-line-strong',
                        )}
                    >
                        {step.at ? <Check className="size-3" aria-hidden /> : null}
                    </span>
                    <span
                        className={
                            step.at
                                ? 'text-ink'
                                : index === current && !stopped
                                  ? 'text-ink/70'
                                  : 'text-subtle'
                        }
                    >
                        {step.label}
                    </span>
                    {step.at ? (
                        <span className="ml-auto text-xs text-subtle tabular">{formatTime(step.at)}</span>
                    ) : index === current && !stopped ? (
                        <span className="ml-auto text-xs text-subtle">aguardando</span>
                    ) : null}
                </li>
            ))}
        </ol>
    )
}
