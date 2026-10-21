import type { CreateEnvelopeInput, EnvelopeDto } from '@lidersign/shared'

import { fetchJson } from '@lidersign/ui'

import { enc, PARTNER_BASE } from '@/lib/endpoints'

export type EnvelopeFile = 'original' | 'signed' | 'timestamp'

export const envelopesApi = {
    listUrl: `${PARTNER_BASE}/envelopes`,
    detailUrl: (id: string) => `${PARTNER_BASE}/envelopes/${enc(id)}`,
    fileUrl: (id: string, file: EnvelopeFile) => `${PARTNER_BASE}/envelopes/${enc(id)}/files/${file}`,
    create: (input: CreateEnvelopeInput) =>
        fetchJson<EnvelopeDto>(`${PARTNER_BASE}/envelopes`, { method: 'POST', body: JSON.stringify(input) }),
    resend: (id: string) =>
        fetchJson<EnvelopeDto>(`${PARTNER_BASE}/envelopes/${enc(id)}/resend`, { method: 'POST' }),
    cancel: (id: string) =>
        fetchJson<EnvelopeDto>(`${PARTNER_BASE}/envelopes/${enc(id)}/cancel`, { method: 'POST' }),
}
