import { Link } from 'react-router'

import { cn, LogoMark } from '@lidersign/ui'

export function Logo({
    className,
    inverted,
    href = '/',
    size = 'md',
}: {
    className?: string
    inverted?: boolean
    href?: string
    size?: 'sm' | 'md'
}) {
    return (
        <Link
            to={href}
            className={cn('inline-flex items-center gap-2 rounded-md', className)}
            aria-label="LíderHub, página inicial"
        >
            <LogoMark inverted={inverted} className={size === 'sm' ? 'size-6' : 'size-7'} />
            <span
                className={cn(
                    'font-semibold tracking-[-0.02em]',
                    size === 'sm' ? 'text-[15px]' : 'text-[17px]',
                    inverted ? 'text-white' : 'text-ink',
                )}
            >
                LíderHub
            </span>
        </Link>
    )
}
