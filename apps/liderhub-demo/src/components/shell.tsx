import {
    Bell,
    BookOpen,
    ChevronsUpDown,
    FileSignature,
    MessageSquare,
    PanelLeft,
    Puzzle,
    Search,
} from 'lucide-react'
import * as React from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { Toaster } from 'sonner'

import { cn, Skeleton, TooltipProvider } from '@lidersign/ui'

import { StatusProvider, useHostStatus } from '@/lib/status'

type NavItem = { to: string; label: string; icon: typeof MessageSquare; badge?: string }

const SECTIONS: { title: string; items: NavItem[] }[] = [
    {
        title: 'Operação',
        items: [
            { to: '/atendimento', label: 'Atendimento', icon: MessageSquare },
            { to: '/contratos', label: 'Contratos', icon: FileSignature, badge: 'Novo' },
        ],
    },
    { title: 'Conexões', items: [{ to: '/integracoes', label: 'Integrações', icon: Puzzle }] },
]

export function Shell() {
    return (
        <StatusProvider>
            <TooltipProvider delayDuration={200}>
                <Frame />
                <Toaster position="bottom-right" richColors closeButton />
            </TooltipProvider>
        </StatusProvider>
    )
}

function Frame() {
    const { status, loading } = useHostStatus()
    const [collapsed, setCollapsed] = React.useState(false)
    const { pathname } = useLocation()
    const wide = pathname.startsWith('/atendimento')
    const officeName = status?.office.name ?? 'Escritório'

    return (
        <div className="min-h-dvh text-ink">
            <div className="flex h-8 items-center justify-center gap-1 bg-amber-100 px-4 text-center text-xs text-amber-950">
                <strong className="font-semibold">Simulação da LíderHub</strong>
                <span className="hidden sm:inline">
                    · o LíderSign é outro sistema e conversa com ela só pela API ·
                </span>
                <NavLink to="/docs" className="font-semibold underline underline-offset-2">
                    Como funciona
                </NavLink>
            </div>

            <div className="flex">
                <aside
                    className={cn(
                        'sticky top-0 hidden h-[calc(100dvh-32px)] w-[248px] shrink-0 flex-col border-r border-line bg-[#f7f7f8]',
                        !collapsed && 'lg:flex',
                    )}
                >
                    <div className="flex h-14 items-center gap-2 px-3">
                        <span className="flex size-7 items-center justify-center rounded-md bg-ink text-[11px] font-bold text-white">
                            {initials(officeName)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{officeName}</span>
                        <ChevronsUpDown className="size-4 text-subtle" aria-hidden />
                        <Search className="ml-1 size-4 text-subtle" aria-hidden />
                    </div>
                    <nav aria-label="LíderHub" className="flex-1 space-y-5 overflow-y-auto px-2 pt-3">
                        {SECTIONS.map((section) => (
                            <div key={section.title}>
                                <p className="px-2.5 pb-1.5 text-xs text-muted">{section.title}</p>
                                <div className="space-y-0.5">
                                    {section.items.map((item) => (
                                        <NavLink
                                            key={item.to}
                                            to={item.to}
                                            className={({ isActive }) =>
                                                cn(
                                                    'flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors',
                                                    isActive
                                                        ? 'bg-[#ebebed] font-medium text-ink'
                                                        : 'text-ink/80 hover:bg-[#efeff1]',
                                                )
                                            }
                                        >
                                            <item.icon className="size-4" aria-hidden />
                                            {item.label}
                                            {item.badge ? (
                                                <span className="ml-auto rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                                                    {item.badge}
                                                </span>
                                            ) : null}
                                        </NavLink>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>
                    <NavLink
                        to="/docs"
                        className={({ isActive }) =>
                            cn(
                                'mx-2 mb-2 flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors',
                                isActive ? 'bg-[#ebebed] font-medium' : 'text-muted hover:bg-[#efeff1]',
                            )
                        }
                    >
                        <BookOpen className="size-4" aria-hidden /> Docs da integração
                    </NavLink>
                    <div className="flex items-center gap-2.5 border-t border-line px-3 py-3">
                        <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                            AP
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">Ana Paula Souza</span>
                            <span className="block truncate text-xs text-muted">Administradora</span>
                        </span>
                        <ChevronsUpDown className="size-4 text-subtle" aria-hidden />
                    </div>
                </aside>

                <div className="min-w-0 flex-1">
                    <header className="flex h-14 items-center justify-between gap-3 border-b border-line bg-white px-4">
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setCollapsed((value) => !value)}
                                aria-label={collapsed ? 'Mostrar menu' : 'Esconder menu'}
                                className="hidden size-8 items-center justify-center rounded-lg text-muted hover:bg-surface lg:flex"
                            >
                                <PanelLeft className="size-4" />
                            </button>
                            <nav aria-label="LíderHub" className="flex gap-1 lg:hidden">
                                {SECTIONS.flatMap((section) => section.items).map((item) => (
                                    <NavLink
                                        key={item.to}
                                        to={item.to}
                                        className={({ isActive }) =>
                                            cn(
                                                'flex h-8 items-center rounded-lg px-2.5 text-sm',
                                                isActive ? 'bg-surface font-medium' : 'text-muted',
                                            )
                                        }
                                    >
                                        {item.label}
                                    </NavLink>
                                ))}
                            </nav>
                        </div>
                        <div className="flex items-center gap-2">
                            <Bell className="size-4 text-muted" aria-hidden />
                            <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                                AP
                            </span>
                        </div>
                    </header>

                    <main
                        className={cn(
                            'mx-auto px-4 py-7 sm:px-8',
                            wide ? 'max-w-[1400px]' : 'max-w-[1200px]',
                        )}
                    >
                        {loading ? <Skeleton className="h-[520px] w-full rounded-xl" /> : <Outlet />}
                    </main>
                </div>
            </div>
        </div>
    )
}

function initials(name: string) {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
}
