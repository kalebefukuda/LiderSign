import { Link } from 'react-router'

import { cn } from '@/lib/cn'

/** Marca geométrica do LíderSign: um traço de assinatura que termina em check. */
export function LogoMark({ className, inverted }: { className?: string; inverted?: boolean }) {
    return (
        <svg viewBox="0 0 32 32" className={cn('size-7', className)} aria-hidden>
            <rect width="32" height="32" rx="9" fill={inverted ? '#ffffff' : '#2463EB'} />
            <path
                d="M8 19.5c2.2-4.8 4.4-7.2 5.6-6.4 1.4 1-1.6 6.9.2 7.2 1.2.2 2.3-2.4 3.4-2.3.9.1.6 1.9 1.5 2.1l2.1-.4L24 15"
                fill="none"
                stroke={inverted ? '#2463EB' : '#ffffff'}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}

export function Logo({ className, inverted, href = '/' }: { className?: string; inverted?: boolean; href?: string }) {
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
