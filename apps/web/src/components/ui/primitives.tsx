import * as LabelPrimitive from '@radix-ui/react-label'
import * as React from 'react'

import { cn } from '@/lib/cn'

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
    return <div className={cn('rounded-2xl border border-line bg-white', className)} {...props} />
}

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
    return (
        <input
            className={cn(
                'h-11 w-full rounded-[10px] border border-line-strong bg-white px-3.5 text-[15px] text-ink outline-none transition-colors duration-150 placeholder:text-subtle focus:border-brand focus:ring-3 focus:ring-brand/15 disabled:bg-surface disabled:text-muted aria-[invalid=true]:border-red-400',
                className,
            )}
            {...props}
        />
    )
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
    return (
        <textarea
            className={cn(
                'w-full rounded-[10px] border border-line-strong bg-white px-3.5 py-3 text-[15px] leading-relaxed text-ink outline-none transition-colors duration-150 placeholder:text-subtle focus:border-brand focus:ring-3 focus:ring-brand/15',
                className,
            )}
            {...props}
        />
    )
}

export function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
    return (
        <div className="relative">
            <select
                className={cn(
                    'h-11 w-full appearance-none rounded-[10px] border border-line-strong bg-white pl-3.5 pr-9 text-[15px] text-ink outline-none transition-colors duration-150 focus:border-brand focus:ring-3 focus:ring-brand/15 disabled:bg-surface',
                    className,
                )}
                {...props}
            >
                {children}
            </select>
            <svg
                aria-hidden
                viewBox="0 0 16 16"
                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            >
                <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        </div>
    )
}

export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
    return <LabelPrimitive.Root className={cn('text-sm font-medium text-ink', className)} {...props} />
}

export function Field({
    label,
    htmlFor,
    hint,
    error,
    children,
    className,
}: {
    label: string
    htmlFor?: string
    hint?: string
    error?: string
    children: React.ReactNode
    className?: string
}) {
    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            <Label htmlFor={htmlFor}>{label}</Label>
            {children}
            {error ? (
                <p className="text-[13px] text-red-600">{error}</p>
            ) : hint ? (
                <p className="text-[13px] text-muted">{hint}</p>
            ) : null}
        </div>
    )
}

export function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
    return <div className={cn('animate-pulse rounded-lg bg-line/70', className)} {...props} />
}

export function Kicker({ className, ...props }: React.ComponentProps<'p'>) {
    return (
        <p
            className={cn('text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle', className)}
            {...props}
        />
    )
}

export function Divider({ className }: { className?: string }) {
    return <div className={cn('h-px w-full bg-line', className)} />
}
