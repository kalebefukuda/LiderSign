import type { OfficeMeDto } from '@lidersign/shared'
import { RefreshCw, ServerCrash } from 'lucide-react'
import { Navigate, Outlet, useLocation } from 'react-router'

import { Button, EmptyState, Skeleton, useResource } from '@lidersign/ui'

import { AssistantProvider } from '@/features/assistant'
import { NotificationsProvider } from '@/features/notifications'
import { OfficeProvider, officeApi } from '@/features/office'
import { AppShell } from '@/features/shell'

export default function AppLayout() {
    const me = useResource<OfficeMeDto>(officeApi.meUrl)
    const { pathname, search } = useLocation()

    if (me.error?.status === 401 || me.error?.status === 403) {
        return <Navigate to={`/entrar?next=${encodeURIComponent(pathname + search)}`} replace />
    }

    if (!me.data) {
        return (
            <div className="flex h-dvh bg-[#f7f7f8] p-2">
                <div className="hidden w-[240px] shrink-0 space-y-3 p-3 lg:block">
                    <Skeleton className="h-7 w-32" />
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full" />
                </div>
                <div className="flex flex-1 items-center justify-center rounded-xl border border-line bg-white">
                    {me.error ? (
                        <EmptyState
                            icon={<ServerCrash />}
                            title="Sem conexão com a LíderHub"
                            description="Não foi possível carregar o escritório. Confira se o servidor está no ar e tente de novo."
                            action={
                                <Button variant="secondary" onClick={() => void me.reload()}>
                                    <RefreshCw aria-hidden /> Tentar de novo
                                </Button>
                            }
                        />
                    ) : (
                        <Skeleton className="h-[60%] w-[80%] rounded-2xl" />
                    )}
                </div>
            </div>
        )
    }

    return (
        <OfficeProvider value={me.data} reload={me.reload}>
            <NotificationsProvider>
                <AssistantProvider>
                    <AppShell office={me.data}>
                        <Outlet />
                    </AppShell>
                </AssistantProvider>
            </NotificationsProvider>
        </OfficeProvider>
    )
}
