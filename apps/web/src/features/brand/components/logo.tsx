import { Link } from 'react-router'

import { cn, LogoMark } from '@lidersign/ui'

export function Logo({
    className,
    inverted,
    href = '/',
}: {
    className?: string
    inverted?: boolean
    href?: string
}) {
    return (
        <Link
            to={href}
            className={cn('inline-flex items-center gap-2.5 rounded-md', className)}
            aria-label="LíderSign, página inicial"
        >
            <LogoMark inverted={inverted} />
            <span
                className={cn(
                    'text-[17px] font-semibold tracking-[-0.02em]',
                    inverted ? 'text-white' : 'text-ink',
                )}
            >
                LíderSign
            </span>
        </Link>
    )
}
