import type { OfficeMeDto } from '@lidersign/shared'
import { ArrowUpRight, LogOut, RefreshCw, ServerCrash, ShieldCheck } from 'lucide-react'
import * as React from 'react'
import { Link, Outlet } from 'react-router'

import { Button, EmptyState, Skeleton, useResource } from '@lidersign/ui'

import { Logo, PanelNav } from '@/features/brand'
import { AccessScreen, OfficeProvider, officeApi, partnerLink } from '@/features/office'

export default function PanelLayout() {
    const me = useResource<OfficeMeDto>(officeApi.meUrl)
    const embedded = typeof window !== 'undefined' && window.self !== window.top

    if (me.error?.status === 401) return <AccessScreen reason="session" />
    if (me.error?.status === 403) return <AccessScreen reason="inactive" />

    let content: React.ReactNode
    if (me.data) {
        content = <Outlet />
    } else if (me.error) {
        content = (
            <EmptyState
                icon={<ServerCrash />}
                title="Sem conexão com o LíderSign"
                description="Não foi possível carregar o painel. Confira a internet e tente de novo."
                action={
                    <Button variant="secondary" onClick={() => void me.reload()}>
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

    const page = me.data ? (
        <OfficeProvider value={me.data} reload={me.reload}>
            {content}
        </OfficeProvider>
    ) : (
        content
    )

    if (embedded) return <div className="min-h-dvh bg-white px-5 py-6 sm:px-8">{page}</div>

    return (
        <div className="min-h-dvh bg-white lg:grid lg:grid-cols-[232px_1fr]">
            <aside className="hidden border-r border-line lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
                <div className="flex h-16 items-center px-5">
                    <Logo href="/painel" />
                </div>
                <p className="truncate px-5 pb-5 text-sm text-muted" title={me.data?.tenant.name}>
                    {me.data?.tenant.name ?? ' '}
                </p>
                <div className="px-3">
                    <PanelNav />
                </div>
                <div className="mt-auto space-y-3 px-5 py-6">
                    {me.data ? <PartnerBack office={me.data} /> : null}
                    <Link
                        to="/v"
                        className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
                    >
                        <ShieldCheck className="size-4" aria-hidden /> Verificar documento
                    </Link>
                    <LogoutButton />
                </div>
            </aside>

            <div className="min-w-0">
                <header className="border-b border-line lg:hidden">
                    <div className="flex h-14 items-center justify-between px-4">
                        <Logo href="/painel" />
                        <LogoutButton compact />
                    </div>
                    <div className="px-3 pb-2">
                        <PanelNav orientation="horizontal" />
                    </div>
                </header>
                <main className="mx-auto max-w-6xl px-5 py-10 sm:px-10 sm:py-14">{page}</main>
            </div>
        </div>
    )
}

function PartnerBack({ office }: { office: OfficeMeDto }) {
    const href = partnerLink(office, '/contratos')
    if (!href) return null
    return (
        <a
            href={href}
            className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink"
        >
            <ArrowUpRight className="size-4" aria-hidden /> Voltar para a {office.partner.name}
        </a>
    )
}

function LogoutButton({ compact }: { compact?: boolean }) {
    const [busy, setBusy] = React.useState(false)

    async function logout() {
        setBusy(true)
        try {
            await officeApi.logout()
        } finally {
            setBusy(false)
            window.location.replace('/painel?saiu=1')
        }
    }

    return (
        <button
            type="button"
            onClick={() => void logout()}
            disabled={busy}
            className={
                compact
                    ? 'text-sm text-muted hover:text-ink'
                    : 'flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink disabled:opacity-60'
            }
        >
            {compact ? null : <LogOut className="size-4" aria-hidden />} Sair
        </button>
    )
}
