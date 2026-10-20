import { Check, Copy } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/cn'

export function EmptyState({
    icon,
    title,
    description,
    action,
    className,
}: {
    icon?: React.ReactNode
    title: string
    description?: React.ReactNode
    action?: React.ReactNode
    className?: string
}) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line-strong px-6 py-14 text-center',
                className,
            )}
        >
            {icon ? (
                <div className="flex size-11 items-center justify-center rounded-xl border border-line bg-white text-muted [&_svg]:size-5">
                    {icon}
                </div>
            ) : null}
            <div className="max-w-sm space-y-1">
                <p className="text-[15px] font-semibold text-ink">{title}</p>
                {description ? <p className="text-sm leading-relaxed text-muted">{description}</p> : null}
            </div>
            {action ? <div className="pt-2">{action}</div> : null}
        </div>
    )
}

export function ErrorNotice({ message, action }: { message: string; action?: React.ReactNode }) {
    return (
        <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50/60 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
        >
            <p className="leading-relaxed">{message}</p>
            {action}
        </div>
    )
}

export function CopyButton({ value, label = 'Copiar', className }: { value: string; label?: string; className?: string }) {
    const [copied, setCopied] = React.useState(false)
    return (
        <button
            type="button"
            onClick={async () => {
                try {
                    await navigator.clipboard.writeText(value)
                    setCopied(true)
                    window.setTimeout(() => setCopied(false), 1600)
                } catch {
                    /* sem permissão de área de transferência: ignora */
                }
            }}
            className={cn(
                'inline-flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink',
                className,
            )}
            aria-label={copied ? 'Copiado' : label}
            title={copied ? 'Copiado' : label}
        >
            {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
        </button>
    )
}
