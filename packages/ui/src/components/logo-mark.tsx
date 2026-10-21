import { cn } from '../lib/cn'

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
