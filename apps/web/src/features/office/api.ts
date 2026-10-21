import type {
    MessageStatus,
    OfficeSettingsDto,
    UpdateOfficeSettingsInput,
    WebhookDeliveryDto,
} from '@lidersign/shared'

import { fetchJson } from '@lidersign/ui'

import { OFFICE_BASE } from '@/lib/endpoints'

export type PartnerInfo = { name: string; url: string | null }

export const officeApi = {
    meUrl: `${OFFICE_BASE}/me`,
    logoUrl: `${OFFICE_BASE}/logo`,
    webhooksUrl: `${OFFICE_BASE}/webhooks`,
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
    retryWebhook: (id: string) =>
        fetchJson<{ accepted: boolean }>(`${OFFICE_BASE}/webhooks/${encodeURIComponent(id)}/retry`, {
            method: 'POST',
        }),
    listWebhooks: () => fetchJson<WebhookDeliveryDto[]>(`${OFFICE_BASE}/webhooks`, { cache: 'no-store' }),
    partnerUrl: '/v1/public/partner',
    logout: () => fetchJson<void>(`${OFFICE_BASE}/logout`, { method: 'POST' }),
    whatsappTest: (phone: string) =>
        fetchJson<{ status: MessageStatus; error: string | null; provider: string }>(
            `${OFFICE_BASE}/whatsapp-test`,
            { method: 'POST', body: JSON.stringify({ phone }) },
        ),
}
