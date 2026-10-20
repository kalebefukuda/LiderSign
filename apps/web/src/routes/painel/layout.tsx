import { ArrowRight, PlugZap, ServerCrash, ShieldCheck } from 'lucide-react'
import * as React from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/states'
import { Logo, PanelNav } from '@/features/brand'
import { demoApi, onDemoStatusChange, type DemoStatus } from '@/features/demo'
import { errorMessage } from '@/lib/http'
import { useResource } from '@/lib/use-resource'

/** Páginas que funcionam mesmo com o LíderSign desligado (é nelas que se liga e configura). */
const ALWAYS_OPEN = ['/painel/integracao', '/painel/configuracoes']

/** Painel do escritório. Na LíderHub ele vive dentro da plataforma; aqui usa o escritório de demonstração. */
export default function PanelLayout() {
    const { pathname } = useLocation()
    const status = useResource<DemoStatus>(demoApi.statusUrl)
    const [activating, setActivating] = React.useState(false)
    const officeName = status.data?.tenant?.name ?? 'Escritório de demonstração'
    const open = ALWAYS_OPEN.some((path) => pathname.startsWith(path))
    const { reload } = status

    React.useEffect(() => onDemoStatusChange(() => void reload()), [reload])

    async function activate() {
        setActivating(true)
        try {
            await demoApi.activate()
            toast.success('LíderSign ativo, com os modelos de exemplo')
        } catch (error) {
            toast.error(errorMessage(error))
        } finally {
            setActivating(false)
        }
    }

    let content: React.ReactNode
    if (status.loading && !status.data) {
        content = (
            <div className="space-y-4">
                <Skeleton className="h-8 w-56" />
                <Skeleton className="h-4 w-96 max-w-full" />
                <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
            </div>
        )
    } else if (!status.data) {
        content = (
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
        )
    } else if (status.data.active || open) {
        content = <Outlet />
    } else {
        content = (
            <EmptyState
                icon={<PlugZap />}
                title="Ative o LíderSign para começar"
                description="Um clique cria o escritório de demonstração, já com dois modelos de contrato. Na LíderHub, é o switch que o escritório liga."
                action={
                    <div className="flex flex-wrap justify-center gap-2">
                        <Button loading={activating} onClick={() => void activate()}>
                            Ativar o escritório de demonstração
                        </Button>
                        <Button asChild variant="ghost">
                            <Link to="/painel/integracao">
                                Como a integração funciona <ArrowRight aria-hidden />
                            </Link>
                        </Button>
                    </div>
                }
            />
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
