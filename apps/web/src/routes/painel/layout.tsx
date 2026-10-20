import { RefreshCw, ServerCrash, ShieldCheck } from 'lucide-react'
import * as React from 'react'
import { Link, Outlet } from 'react-router'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/states'
import { Logo, PanelNav } from '@/features/brand'
import { demoApi, onDemoStatusChange, type DemoStatus } from '@/features/demo'
import { errorMessage } from '@/lib/http'
import { useResource } from '@/lib/use-resource'

/**
 * Painel do escritório. Na LíderHub ele vive dentro da plataforma e o escritório já chega com o
 * LíderSign ligado; aqui, na demonstração, o painel liga o escritório de exemplo sozinho.
 */
export default function PanelLayout() {
    const status = useResource<DemoStatus>(demoApi.statusUrl)
    const [activationError, setActivationError] = React.useState<string | null>(null)
    const activating = React.useRef(false)
    const officeName = status.data?.tenant?.name ?? 'Seu escritório'
    const { reload } = status

    React.useEffect(() => onDemoStatusChange(() => void reload()), [reload])

    React.useEffect(() => {
        if (!status.data || status.data.active || activating.current) return
        activating.current = true
        demoApi
            .activate()
            .catch((error) => setActivationError(errorMessage(error)))
            .finally(() => {
                activating.current = false
            })
    }, [status.data])

    let content: React.ReactNode
    if (status.data?.active) {
        content = <Outlet />
    } else if ((status.error && !status.data) || activationError) {
        content = (
            <EmptyState
                icon={<ServerCrash />}
                title="Sem conexão com o LíderSign"
                description={activationError ?? 'Não foi possível carregar o painel. Confira se o sistema está no ar.'}
                action={
                    <Button
                        variant="secondary"
                        onClick={() => {
                            setActivationError(null)
                            void status.reload()
                        }}
                    >
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

    return (
        <div className="min-h-dvh bg-white lg:grid lg:grid-cols-[248px_1fr]">
            <aside className="hidden border-r border-line lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
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
                    <Link
                        to="/v"
                        className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
                    >
                        <ShieldCheck className="size-4" aria-hidden /> Verificar um documento
                    </Link>
                </div>
            </aside>

            <div className="min-w-0">
                <header className="border-b border-line lg:hidden">
                    <div className="flex h-14 items-center justify-between px-4">
                        <Logo />
                        <Link to="/v" className="text-sm text-muted">
                            Verificar
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
