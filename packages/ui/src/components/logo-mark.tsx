import { cn } from '../lib/cn'

/** Marca genérica da demonstração: balão de conversa com um traço de assinatura. */
export function LogoMark({ className, inverted }: { className?: string; inverted?: boolean }) {
    const fg = inverted ? '#2463EB' : '#ffffff'
    return (
        <svg viewBox="0 0 32 32" className={cn('size-7', className)} aria-hidden>
            <rect width="32" height="32" rx="9" fill={inverted ? '#ffffff' : '#2463EB'} />
            <path
                d="M9 10.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7.5L11 25v-3.5H9a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"
                fill="none"
                stroke={fg}
                strokeWidth="2"
                strokeLinejoin="round"
            />
            <path
                d="m12 16.2 2.6 2.4 5.4-5.2"
                fill="none"
                stroke={fg}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}
