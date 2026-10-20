import { FileSignature, FileText, PlugZap, Send, Settings } from 'lucide-react'
import { Link, useLocation } from 'react-router'

import { cn } from '@/lib/cn'

const primary = { href: '/painel/enviar', label: 'Enviar para assinatura', icon: Send }

const groups = [
    [
        { href: '/painel/envelopes', label: 'Envios', icon: FileSignature },
        { href: '/painel/modelos', label: 'Modelos', icon: FileText },
    ],
    [
        { href: '/painel/integracao', label: 'Integração LíderHub', icon: PlugZap },
        { href: '/painel/configuracoes', label: 'Configurações', icon: Settings },
    ],
]

export function PanelNav({ orientation = 'vertical' }: { orientation?: 'vertical' | 'horizontal' }) {
    const { pathname } = useLocation()
    const vertical = orientation === 'vertical'
    const sendActive = pathname.startsWith(primary.href)

    const item = (entry: (typeof groups)[number][number]) => {
        const active = pathname.startsWith(entry.href)
        const Icon = entry.icon
        return (
            <Link
                key={entry.href}
                to={entry.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                    'flex h-10 shrink-0 items-center gap-2.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150',
                    active ? 'bg-surface text-ink' : 'text-muted hover:bg-surface/70 hover:text-ink',
                )}
            >
                <Icon className="size-4" aria-hidden />
                {entry.label}
            </Link>
        )
    }

    return (
        <nav aria-label="Painel" className={cn(vertical ? 'flex flex-col gap-1' : 'flex gap-1 overflow-x-auto')}>
            <Link
                to={primary.href}
                aria-current={sendActive ? 'page' : undefined}
                className={cn(
                    'flex h-10 shrink-0 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold whitespace-nowrap transition-colors duration-150',
                    sendActive ? 'bg-brand text-white' : 'bg-brand-soft text-brand hover:bg-brand hover:text-white',
                    vertical && 'mb-3',
                )}
            >
                <primary.icon className="size-4" aria-hidden />
                {primary.label}
            </Link>
            {groups.map((group, index) => (
                <div
                    key={index}
                    className={cn(vertical ? 'flex flex-col gap-1' : 'flex gap-1', vertical && index > 0 && 'mt-5 border-t border-line pt-5')}
                >
                    {group.map(item)}
                </div>
            ))}
        </nav>
    )
}
