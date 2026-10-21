import { ArrowUpRight, PlugZap, RefreshCw, ServerCrash, ShieldCheck } from 'lucide-react'
import * as React from 'react'
import { Link, Outlet } from 'react-router'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/states'
import { Logo, PanelNav } from '@/features/brand'
import { demoApi, onDemoStatusChange, type DemoStatus } from '@/features/demo'
import { useResource } from '@/lib/use-resource'

export default function PanelLayout() {
    const status = useResource<DemoStatus>(demoApi.statusUrl)
    const officeName = status.data?.tenant?.name ?? 'Escritório'
    const { reload } = status

    React.useEffect(() => onDemoStatusChange(() => void reload()), [reload])

    const embedded = typeof window !== 'undefined' && window.self !== window.top

    let content: React.ReactNode
    if (status.data?.active) {
        content = <Outlet />
    } else if (status.data) {
        content = (
            <EmptyState
                icon={<PlugZap />}
                title="O LíderSign ainda não está ativo neste escritório"
                description="Ele é ativado pela LíderHub, em Integrações: um clique, sem criar conta nem copiar token."
                action={
                    <Button asChild>
                        <Link to="/liderhub?aba=integracoes">
                            Ativar pela LíderHub (simulação) <ArrowUpRight aria-hidden />
                        </Link>
                    </Button>
                }
            />
        )
    } else if (status.error) {
        content = (
            <EmptyState
                icon={<ServerCrash />}
                title="Sem conexão com o LíderSign"
                description="Não foi possível carregar o painel. Confira se o sistema está no ar."
                action={
                    <Button variant="secondary" onClick={() => void status.reload()}>
                        <RefreshCw aria-hidden /> Tentar de novo
                    </Button>
                }
            />
        )
    } else {
        content = (
            <div className="space-y-4" aria-busy="true">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-4 w-96 max-w-full" />
                <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
            </div>
        )
    }

    if (embedded) {
        return <div className="min-h-dvh bg-white px-5 py-6 sm:px-8">{content}</div>
    }

    return (
        <div className="min-h-dvh bg-white lg:grid lg:grid-cols-[232px_1fr]">
            <aside className="hidden border-r border-line lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
                <div className="flex h-16 items-center px-5">
                    <Logo />
                </div>
                <p className="truncate px-5 pb-5 text-sm text-muted" title={officeName}>
                    {officeName}
                </p>
                <div className="px-3">
                    <PanelNav />
                </div>
                <div className="mt-auto space-y-3 px-5 py-6">
                    <Link
                        to="/liderhub"
                        className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
                    >
                        <ArrowUpRight className="size-4" aria-hidden /> Voltar para a LíderHub
                    </Link>
                    <Link
                        to="/v"
                        className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
                    >
                        <ShieldCheck className="size-4" aria-hidden /> Verificar documento
                    </Link>
                </div>
            </aside>

            <div className="min-w-0">
                <header className="border-b border-line lg:hidden">
                    <div className="flex h-14 items-center justify-between px-4">
                        <Logo />
                        <Link to="/liderhub" className="text-sm text-muted">
                            LíderHub
                        </Link>
                    </div>
                    <div className="px-3 pb-2">
                        <PanelNav orientation="horizontal" />
                    </div>
                </header>
                <main className="mx-auto max-w-6xl px-5 py-10 sm:px-10 sm:py-14">{content}</main>
            </div>
        </div>
    )
}
