import type { EnvelopeDto } from '@lidersign/shared'

import { fetchJson } from '@lidersign/ui'

export type HostStatus = {
    active: boolean
    office: { id: string; name: string }
    templatesCount: number
    lidersignUrl: string
}

export type CallLogEntry = {
    at: string
    direction: 'liderhub-to-lidersign' | 'lidersign-to-liderhub'
    method: string
    path: string
    status: number
    ms: number
    detail: string | null
}

const enc = encodeURIComponent

export function openLiderSign(to = '/painel') {
    return `/api/lidersign/open?to=${enc(to)}`
}

export const hubApi = {
    statusUrl: '/api/status',
    templatesUrl: '/api/templates',
    contractsUrl: '/api/contracts',
    callsUrl: '/api/calls',
    contractUrl: (id: string) => `/api/contracts/${enc(id)}`,
    pdfUrl: (id: string) => `/api/contracts/${enc(id)}/pdf`,
    activate: () => fetchJson<{ created: boolean }>('/api/lidersign/activate', { method: 'POST' }),
    deactivate: () => fetchJson<void>('/api/lidersign/deactivate', { method: 'POST' }),
    sendContract: (input: { contactId: string; templateId: string; phone: string }) =>
        fetchJson<EnvelopeDto>('/api/contracts', { method: 'POST', body: JSON.stringify(input) }),
    reset: () => fetchJson<void>('/api/reset', { method: 'POST' }),
}
