import type { OfficeMeDto } from '@lidersign/shared'
import * as React from 'react'

type OfficeContextValue = { office: OfficeMeDto; reload: () => Promise<unknown> }

const OfficeContext = React.createContext<OfficeContextValue | null>(null)

export function OfficeProvider({
    value,
    reload,
    children,
}: {
    value: OfficeMeDto
    reload: () => Promise<unknown>
    children: React.ReactNode
}) {
    const context = React.useMemo(() => ({ office: value, reload }), [value, reload])
    return <OfficeContext.Provider value={context}>{children}</OfficeContext.Provider>
}

function useOfficeContext() {
    const value = React.useContext(OfficeContext)
    if (!value) throw new Error('useOffice fora do painel')
    return value
}

export function useOffice(): OfficeMeDto {
    return useOfficeContext().office
}

export function useOfficeReload() {
    return useOfficeContext().reload
}

export function partnerLink(office: OfficeMeDto, path = '') {
    return office.partner.url ? `${office.partner.url}${path}` : null
}
