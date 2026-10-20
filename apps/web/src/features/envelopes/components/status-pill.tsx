import { ENVELOPE_STATUS_LABEL, type EnvelopeStatus } from '@lidersign/shared'

import { Badge, type BadgeProps } from '@/components/ui/badge'

const TONE: Record<EnvelopeStatus, BadgeProps['tone']> = {
    SENT: 'warning',
    VIEWED: 'warning',
    SIGNED: 'brand',
    COMPLETED: 'success',
    CANCELED: 'muted',
    EXPIRED: 'muted',
}

export function StatusPill({ status, className }: { status: EnvelopeStatus; className?: string }) {
    return (
        <Badge tone={TONE[status]} dot className={className}>
            {ENVELOPE_STATUS_LABEL[status]}
        </Badge>
    )
}
