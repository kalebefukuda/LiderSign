import type { MessageStatus } from '@lidersign/shared'

import { fetchJson } from '@lidersign/ui'

import { OFFICE_BASE } from '@/lib/endpoints'

export type PartnerInfo = { name: string; url: string | null }

export const officeApi = {
    meUrl: `${OFFICE_BASE}/me`,
    partnerUrl: '/v1/public/partner',
    logout: () => fetchJson<void>(`${OFFICE_BASE}/logout`, { method: 'POST' }),
    whatsappTest: (phone: string) =>
        fetchJson<{ status: MessageStatus; error: string | null; provider: string }>(
            `${OFFICE_BASE}/whatsapp-test`,
            { method: 'POST', body: JSON.stringify({ phone }) },
        ),
}
