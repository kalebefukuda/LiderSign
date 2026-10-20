import { ArrowUpRight, MessagesSquare, Puzzle } from 'lucide-react'
import * as React from 'react'
import { Link, useSearchParams } from 'react-router'

import { Skeleton } from '@/components/ui/primitives'
import { demoApi, type DemoStatus } from '@/features/demo'
import { cn } from '@/lib/cn'
import { useResource } from '@/lib/use-resource'

import { ConversationTab } from './conversation-tab'
import { IntegrationsTab } from './integrations-tab'

type Tab = 'conversas' | 'integracoes'

/**
 * Simulação da LíderHub, só para demonstrar a integração: é daqui que o escritório usa o LíderSign
 * no dia a dia. Visual próprio e aviso fixo, para ninguém confundir com o produto.
 */
export function LiderHubSim() {
    const status = useResource<DemoStatus>(demoApi.statusUrl)
    const [params, setParams] = useSearchParams()
    const active = Boolean(status.data?.active)
    // A aba inicial depende de o LíderSign já estar ativo; depois, só muda quando a pessoa clica
    const [initial, setInitial] = React.useState<Tab | null>(null)
    React.useEffect(() => {
        if (status.data && !initial) setInitial(status.data.active ? 'conversas' : 'integracoes')
    }, [status.data, initial])
    const tab: Tab = (params.get('aba') as Tab | null) ?? initial ?? 'integracoes'
    const go = (next: Tab) => setParams({ aba: next }, { replace: true })

    return (
        <div className="min-h-dvh bg-[#f6f7f9]">
            <div className="bg-amber-100 px-4 py-2 text-center text-[13px] text-amber-950">
                <strong className="font-semibold">Simulação da LíderHub.</strong> Esta tela imita a LíderHub
                para mostrar como o escritório usa o LíderSign.{' '}
                <Link
                    to="/painel"
                    className="inline-flex items-center gap-0.5 font-semibold underline underline-offset-2"
                >
                    Abrir o LíderSign <ArrowUpRight className="size-3.5" aria-hidden />
                </Link>
            </div>

            <div className="lg:grid lg:min-h-[calc(100dvh-36px)] lg:grid-cols-[220px_1fr]">
                <nav aria-label="LíderHub" className="bg-[#111827] px-3 py-4 text-white lg:py-6">
                    <p className="px-3 text-lg font-bold tracking-[-0.02em]">LíderHub</p>
                    <p className="px-3 text-xs text-white/50">Souza Advocacia</p>
                    <div className="mt-4 flex gap-1 lg:mt-8 lg:flex-col">
                        {(
                            [
                                { id: 'conversas', label: 'Conversas', icon: MessagesSquare },
                                { id: 'integracoes', label: 'Integrações', icon: Puzzle },
                            ] as const
                        ).map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => go(item.id)}
                                aria-current={tab === item.id ? 'page' : undefined}
                                className={cn(
                                    'flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-colors',
                                    tab === item.id
                                        ? 'bg-white/12 text-white'
                                        : 'text-white/65 hover:bg-white/8 hover:text-white',
                                )}
                            >
                                <item.icon className="size-4" aria-hidden />
                                {item.label}
                            </button>
                        ))}
                    </div>
                </nav>

                <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 lg:py-10">
                    {status.loading && !status.data ? (
                        <Skeleton className="h-[520px] w-full rounded-2xl" />
                    ) : tab === 'integracoes' ? (
                        <IntegrationsTab status={status.data} onChanged={() => void status.reload()} />
                    ) : (
                        <div className="space-y-5">
                            <h1 className="text-2xl font-bold tracking-[-0.03em]">Conversas</h1>
                            <ConversationTab active={active} onOpenIntegrations={() => go('integracoes')} />
                        </div>
                    )}
                </main>
            </div>
        </div>
    )
}
