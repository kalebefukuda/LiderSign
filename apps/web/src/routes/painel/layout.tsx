import { PlugZap, ServerCrash } from 'lucide-react'
import { Link, Outlet } from 'react-router'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/states'
import { Logo, PanelNav } from '@/features/brand'
import { demoApi, type DemoStatus } from '@/features/demo'
import { useResource } from '@/lib/use-resource'

/** Painel do escritório. Na LíderHub ele vive dentro da plataforma; aqui usa o escritório da demo. */
export default function PanelLayout() {
    const status = useResource<DemoStatus>(demoApi.statusUrl)
    const officeName = status.data?.tenant?.name ?? 'Escritório Demo'

    return (
        <div className="min-h-dvh bg-white lg:grid lg:grid-cols-[248px_1fr]">
            <aside className="hidden border-r border-line lg:flex lg:flex-col">
                <div className="flex h-16 items-center px-5">
                    <Logo />
                </div>
                <div className="px-5 pb-6 pt-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-subtle">Escritório</p>
                    <p className="mt-1 text-sm font-medium leading-snug">{officeName}</p>
                </div>
                <div className="px-3">
                    <PanelNav />
                </div>
                <div className="mt-auto px-5 py-6">
                    <Link to="/demo" className="text-sm text-muted transition-colors hover:text-ink">
                        Voltar para a demonstração
                    </Link>
                </div>
            </aside>

            <div className="min-w-0">
                <header className="border-b border-line lg:hidden">
                    <div className="flex h-14 items-center justify-between px-4">
                        <Logo />
                        <Link to="/demo" className="text-sm text-muted">
                            Demonstração
                        </Link>
                    </div>
                    <div className="px-3 pb-2">
                        <PanelNav orientation="horizontal" />
                    </div>
                </header>
                <main className="mx-auto max-w-6xl px-5 py-10 sm:px-10 sm:py-14">
                    {status.loading && !status.data ? (
                        <div className="space-y-4">
                            <Skeleton className="h-8 w-56" />
                            <Skeleton className="h-4 w-96 max-w-full" />
                            <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
                        </div>
                    ) : status.data?.active ? (
                        <Outlet />
                    ) : status.data ? (
                        <EmptyState
                            icon={<PlugZap />}
                            title="O LíderSign ainda não está ativo neste escritório"
                            description="Ative com um clique na tela de Integrações da demonstração. Os modelos de exemplo já vêm prontos."
                            action={
                                <Button asChild>
                                    <Link to="/demo">Ir para Integrações</Link>
                                </Button>
                            }
                        />
                    ) : (
                        <EmptyState
                            icon={<ServerCrash />}
                            title="Sem conexão com o LíderSign"
                            description="Não foi possível falar com a API. Confira se ela está rodando e tente de novo."
                            action={
                                <Button variant="secondary" onClick={() => void status.reload()}>
                                    Tentar de novo
                                </Button>
                            }
                        />
                    )}
                </main>
            </div>
        </div>
    )
}
