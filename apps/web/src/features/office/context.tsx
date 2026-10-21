import type { OfficeMeDto } from '@lidersign/shared'
import * as React from 'react'

const OfficeContext = React.createContext<OfficeMeDto | null>(null)

export function OfficeProvider({ value, children }: { value: OfficeMeDto; children: React.ReactNode }) {
    return <OfficeContext.Provider value={value}>{children}</OfficeContext.Provider>
}

export function useOffice(): OfficeMeDto {
    const value = React.useContext(OfficeContext)
    if (!value) throw new Error('useOffice fora do painel')
    return value
}

export function partnerLink(office: OfficeMeDto, path = '') {
    return office.partner.url ? `${office.partner.url}${path}` : null
}
