import type { ContactDto } from '@lidersign/shared'
import { CheckCircle2, Clock3, Sparkles } from 'lucide-react'

import { cn } from '@lidersign/ui'

export function ContractChip({ contact, className }: { contact: ContactDto; className?: string }) {
    const status = contact.contract?.status
    const base =
        'inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-0.5 text-[11px] font-medium'
    if (status === 'SENT' || status === 'VIEWED') {
        return (
            <span className={cn(base, 'border-amber-200 bg-amber-50 text-amber-800', className)}>
                <Clock3 className="size-3" aria-hidden /> Aguardando assinatura
            </span>
        )
    }
    if (status === 'SIGNED' || status === 'COMPLETED') {
        return (
            <span className={cn(base, 'border-emerald-200 bg-emerald-50 text-emerald-700', className)}>
                <CheckCircle2 className="size-3" aria-hidden /> Contrato assinado
            </span>
        )
    }
    return (
        <span className={cn(base, 'border-line bg-white text-ink/70', className)}>
            <Sparkles className="size-3 text-amber-500" aria-hidden /> {contact.stage}
        </span>
    )
}
