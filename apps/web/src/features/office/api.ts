import type { MessageStatus, OfficeSettingsDto, UpdateOfficeSettingsInput } from '@lidersign/shared'

import { fetchJson } from '@lidersign/ui'

import { OFFICE_BASE } from '@/lib/endpoints'

export const officeApi = {
    meUrl: `${OFFICE_BASE}/me`,
    logoUrl: `${OFFICE_BASE}/logo`,
    updateSettings: (input: UpdateOfficeSettingsInput) =>
        fetchJson<OfficeSettingsDto>(`${OFFICE_BASE}/settings`, {
            method: 'PATCH',
            body: JSON.stringify(input),
        }),
    uploadLogo: (file: File) => {
        const body = new FormData()
        body.append('file', file)
        return fetchJson<OfficeSettingsDto>(`${OFFICE_BASE}/logo`, { method: 'PUT', body })
    },
    removeLogo: () => fetchJson<OfficeSettingsDto>(`${OFFICE_BASE}/logo`, { method: 'DELETE' }),
    whatsappTest: (phone: string) =>
        fetchJson<{ status: MessageStatus; error: string | null; provider: string }>(
            `${OFFICE_BASE}/whatsapp-test`,
            { method: 'POST', body: JSON.stringify({ phone }) },
        ),
}
