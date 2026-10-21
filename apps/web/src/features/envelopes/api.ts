import type { CreateEnvelopeInput, EnvelopeDto } from '@lidersign/shared'

import { fetchJson } from '@lidersign/ui'

import { enc, API_BASE } from '@/lib/endpoints'

export type EnvelopeFile = 'original' | 'signed' | 'timestamp'

export const envelopesApi = {
    listUrl: `${API_BASE}/envelopes`,
    detailUrl: (id: string) => `${API_BASE}/envelopes/${enc(id)}`,
    fileUrl: (id: string, file: EnvelopeFile) => `${API_BASE}/envelopes/${enc(id)}/files/${file}`,
    create: (input: CreateEnvelopeInput) =>
        fetchJson<EnvelopeDto>(`${API_BASE}/envelopes`, { method: 'POST', body: JSON.stringify(input) }),
    resend: (id: string) =>
        fetchJson<EnvelopeDto>(`${API_BASE}/envelopes/${enc(id)}/resend`, { method: 'POST' }),
    cancel: (id: string) =>
        fetchJson<EnvelopeDto>(`${API_BASE}/envelopes/${enc(id)}/cancel`, { method: 'POST' }),
}
