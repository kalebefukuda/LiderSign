import {
    ArrowUpRight,
    Bell,
    ChevronsUpDown,
    FileSignature,
    MessageSquare,
    PanelLeft,
    Puzzle,
    Search,
} from 'lucide-react'
import * as React from 'react'
import { Link, useSearchParams } from 'react-router'

import { Skeleton } from '@/components/ui/primitives'
import { demoApi, type DemoStatus } from '@/features/demo'
import { cn } from '@/lib/cn'
import { useResource } from '@/lib/use-resource'

import { ContractsPage } from './contracts-page'
import { InboxPage } from './inbox-page'
import { IntegrationsTab } from './integrations-tab'
import { PageHeader } from './page-header'

type Page = 'atendimento' | 'contratos' | 'integracoes'

const SECTIONS: {
    title: string
    items: { id: Page; label: string; icon: typeof MessageSquare; badge?: string }[]
}[] = [
    {
        title: 'Operação',
        items: [
            { id: 'atendimento', label: 'Atendimento', icon: MessageSquare },
            { id: 'contratos', label: 'Contratos', icon: FileSignature, badge: 'Novo' },
        ],
    },
    { title: 'Conexões', items: [{ id: 'integracoes', label: 'Integrações', icon: Puzzle }] },
]

export function LiderHubSim() {
    const status = useResource<DemoStatus>(demoApi.statusUrl)
    const [params, setParams] = useSearchParams()
    const [collapsed, setCollapsed] = React.useState(false)
    const active = Boolean(status.data?.active)

    const [initial, setInitial] = React.useState<Page | null>(null)
    React.useEffect(() => {
        if (status.data && !initial) setInitial(status.data.active ? 'atendimento' : 'integracoes')
    }, [status.data, initial])
    const raw = params.get('aba')
    const page: Page =
        raw === 'conversas' ? 'atendimento' : ((raw as Page | null) ?? initial ?? 'integracoes')
    const go = (next: Page) => setParams({ aba: next }, { replace: true })

    return (
        <div className="min-h-dvh bg-[#fafafa] text-ink">
            <div className="flex h-8 items-center justify-center gap-1 bg-amber-100 px-4 text-center text-xs text-amber-950">
                <strong className="font-semibold">Simulação da LíderHub</strong>
                <span className="hidden sm:inline">· mostra como o escritório usa o LíderSign ·</span>
                <Link
                    to="/painel"
                    className="inline-flex items-center gap-0.5 font-semibold underline underline-offset-2"
                >
                    Abrir o LíderSign <ArrowUpRight className="size-3" aria-hidden />
                </Link>
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
                            SA
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">Souza Advocacia</span>
                        <ChevronsUpDown className="size-4 text-subtle" aria-hidden />
                        <Search className="ml-1 size-4 text-subtle" aria-hidden />
                    </div>
                    <nav aria-label="LíderHub" className="flex-1 space-y-5 overflow-y-auto px-2 pt-3">
                        {SECTIONS.map((section) => (
                            <div key={section.title}>
                                <p className="px-2.5 pb-1.5 text-xs text-muted">{section.title}</p>
                                <div className="space-y-0.5">
                                    {section.items.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => go(item.id)}
                                            aria-current={page === item.id ? 'page' : undefined}
                                            className={cn(
                                                'flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors',
                                                page === item.id
                                                    ? 'bg-[#ebebed] font-medium text-ink'
                                                    : 'text-ink/80 hover:bg-[#efeff1]',
                                            )}
                                        >
                                            <item.icon className="size-4" aria-hidden />
                                            {item.label}
                                            {item.badge ? (
                                                <span className="ml-auto rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                                                    {item.badge}
                                                </span>
                                            ) : null}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>
                    <div className="flex items-center gap-2.5 border-t border-line px-3 py-3">
                        <span className="flex size-8 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                            AP
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">Ana Paula Souza</span>
                            <span className="block truncate text-xs text-muted">
                                ana@souzaadvocacia.com.br
                            </span>
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
                            <div className="flex gap-1 lg:hidden">
                                {SECTIONS.flatMap((section) => section.items).map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => go(item.id)}
                                        className={cn(
                                            'h-8 rounded-lg px-2.5 text-sm',
                                            page === item.id ? 'bg-surface font-medium' : 'text-muted',
                                        )}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
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
                            page === 'atendimento' ? 'max-w-[1400px]' : 'max-w-[1200px]',
                        )}
                    >
                        {status.loading && !status.data ? (
                            <Skeleton className="h-[520px] w-full rounded-xl" />
                        ) : page === 'integracoes' ? (
                            <IntegrationsTab status={status.data} onChanged={() => void status.reload()} />
                        ) : page === 'contratos' ? (
                            <ContractsPage
                                active={active}
                                onOpenIntegrations={() => go('integracoes')}
                                onOpenInbox={() => go('atendimento')}
                            />
                        ) : (
                            <div className="space-y-5">
                                <PageHeader
                                    title="Atendimento"
                                    description="Conversas do WhatsApp com os seus leads."
                                />
                                <InboxPage active={active} onOpenIntegrations={() => go('integracoes')} />
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    )
}
