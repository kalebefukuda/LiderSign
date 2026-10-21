import type {
    ContactDto,
    ConversationDto,
    EnvelopeDto,
    MessageDto,
    SendContractInput,
    SimulatorInboundInput,
} from '@lidersign/shared'

import { fetchJson } from '@lidersign/ui'

import { API_BASE, CONTACTS_BASE, enc, WHATSAPP_BASE } from '@/lib/endpoints'

export const inboxApi = {
    contactsUrl: CONTACTS_BASE,
    conversationUrl: (id: string, view: 'office' | 'client' = 'office') =>
        `${CONTACTS_BASE}/${enc(id)}/conversation${view === 'client' ? '?view=client' : ''}`,
    sendContract: (id: string, input: SendContractInput) =>
        fetchJson<EnvelopeDto>(`${CONTACTS_BASE}/${enc(id)}/contracts`, {
            method: 'POST',
            body: JSON.stringify(input),
        }),
    sendMessage: (id: string, text: string) =>
        fetchJson<MessageDto>(`${CONTACTS_BASE}/${enc(id)}/messages`, {
            method: 'POST',
            body: JSON.stringify({ text }),
        }),
    simulate: (input: SimulatorInboundInput) =>
        fetchJson<{ accepted: boolean; handled: boolean }>(`${WHATSAPP_BASE}/simulator`, {
            method: 'POST',
            body: JSON.stringify(input),
        }),
    nudge: (envelopeId: string) =>
        fetchJson<EnvelopeDto>(`${API_BASE}/envelopes/${enc(envelopeId)}/nudge`, { method: 'POST' }),
}

export type { ContactDto, ConversationDto }
