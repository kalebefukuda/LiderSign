import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '../lib/cn'

const badgeVariants = cva(
    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium',
    {
        variants: {
            tone: {
                neutral: 'border-line bg-surface text-muted',
                brand: 'border-brand/15 bg-brand-soft text-brand',
                success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
                warning: 'border-amber-200 bg-amber-50 text-amber-800',
                danger: 'border-red-200 bg-red-50 text-red-700',
                muted: 'border-slate-200 bg-slate-50 text-slate-600',
                dark: 'border-white/10 bg-white/5 text-white/70',
            },
        },
        defaultVariants: { tone: 'neutral' },
    },
)

export type BadgeProps = React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { dot?: boolean }

export function Badge({ className, tone, dot, children, ...props }: BadgeProps) {
    return (
        <span className={cn(badgeVariants({ tone }), className)} {...props}>
            {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden /> : null}
            {children}
        </span>
    )
}
