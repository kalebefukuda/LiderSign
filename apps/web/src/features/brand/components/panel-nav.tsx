import { FileSignature, FileText } from 'lucide-react'
import { Link, useLocation } from 'react-router'

import { cn } from '@/lib/cn'

const items = [
    { href: '/painel/envelopes', label: 'Envelopes', icon: FileSignature },
    { href: '/painel/modelos', label: 'Modelos', icon: FileText },
]

export function PanelNav({ orientation = 'vertical' }: { orientation?: 'vertical' | 'horizontal' }) {
    const { pathname } = useLocation()
    return (
        <nav
            aria-label="Painel"
            className={cn(orientation === 'vertical' ? 'flex flex-col gap-1' : 'flex gap-1 overflow-x-auto')}
        >
            {items.map((item) => {
                const active = pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                    <Link
                        key={item.href}
                        to={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                            'flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors duration-150',
                            active ? 'bg-surface text-ink' : 'text-muted hover:bg-surface/70 hover:text-ink',
                        )}
                    >
                        <Icon className="size-4" aria-hidden />
                        {item.label}
                    </Link>
                )
            })}
        </nav>
    )
}
