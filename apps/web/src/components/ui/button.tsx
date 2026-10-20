import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/cn'

const buttonVariants = cva(
    'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-medium transition-colors duration-150 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                primary: 'bg-brand text-white hover:bg-brand-hover',
                secondary: 'border border-line-strong bg-white text-ink hover:bg-surface',
                ghost: 'text-muted hover:bg-surface hover:text-ink',
                subtle: 'bg-surface text-ink hover:bg-line/70',
                dark: 'bg-ink text-white hover:bg-ink/90',
                danger: 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
                link: 'h-auto px-0 text-brand underline-offset-4 hover:underline',
            },
            size: {
                sm: 'h-9 px-3 text-sm',
                md: 'h-11 px-4 text-[15px]',
                lg: 'h-12 px-5 text-base',
                icon: 'size-10',
            },
        },
        defaultVariants: { variant: 'primary', size: 'md' },
    },
)

export type ButtonProps = React.ComponentProps<'button'> &
    VariantProps<typeof buttonVariants> & {
        asChild?: boolean
        loading?: boolean
    }

export function Button({ className, variant, size, asChild, loading, disabled, children, ...props }: ButtonProps) {
    const Component = asChild ? Slot : 'button'
    return (
        <Component
            className={cn(buttonVariants({ variant, size }), className)}
            disabled={disabled || loading}
            aria-busy={loading || undefined}
            {...props}
        >
            {asChild ? (
                children
            ) : (
                <>
                    {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
                    {children}
                </>
            )}
        </Component>
    )
}

export { buttonVariants }
