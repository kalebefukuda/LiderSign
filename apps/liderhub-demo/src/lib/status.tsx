import * as React from 'react'

import { useResource } from '@lidersign/ui'

import { hubApi, type HostStatus } from './api'
import { useHubEvents } from './live'

type StatusContextValue = {
    status: HostStatus | undefined
    active: boolean
    loading: boolean
    reload: () => Promise<unknown>
}

const StatusContext = React.createContext<StatusContextValue | null>(null)

export function StatusProvider({ children }: { children: React.ReactNode }) {
    const resource = useResource<HostStatus>(hubApi.statusUrl)
    const { reload } = resource
    useHubEvents((event) => {
        if (event.type === 'status') void reload()
    })
    const value = React.useMemo(
        () => ({
            status: resource.data,
            active: Boolean(resource.data?.active),
            loading: resource.loading && !resource.data,
            reload,
        }),
        [resource.data, resource.loading, reload],
    )
    return <StatusContext.Provider value={value}>{children}</StatusContext.Provider>
}

export function useHostStatus() {
    const value = React.useContext(StatusContext)
    if (!value) throw new Error('useHostStatus fora do StatusProvider')
    return value
}
