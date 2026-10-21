import type { AssistantMessageInput, AssistantReply } from '@lidersign/shared'

import { fetchJson } from '@lidersign/ui'

import { ASSISTANT_BASE } from '@/lib/endpoints'

export const assistantApi = {
    ask: (input: AssistantMessageInput) =>
        fetchJson<AssistantReply>(ASSISTANT_BASE, { method: 'POST', body: JSON.stringify(input) }),
    createTemplate: (file: File) => {
        const body = new FormData()
        body.append('file', file)
        return fetchJson<AssistantReply>(`${ASSISTANT_BASE}/template`, { method: 'POST', body })
    },
}
