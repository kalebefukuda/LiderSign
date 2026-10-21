import type { ContactDto, ConversationDto, StreamEvent } from '@lidersign/shared'
import * as React from 'react'

import { useResource } from '@lidersign/ui'

import { useLiveEvents } from '@/features/realtime'

import { inboxApi } from './api'

const RELEVANT = new Set<StreamEvent['type']>(['message.created', 'envelope.updated', 'contacts.updated'])

/** Recarrega quando chega mensagem ou o contrato muda, juntando rajadas em uma chamada só. */
function useLiveReload(reload: () => Promise<unknown>, enabled = true) {
    const timer = React.useRef<number | undefined>(undefined)
    React.useEffect(() => () => window.clearTimeout(timer.current), [])
    return useLiveEvents((event) => {
        if (!RELEVANT.has(event.type)) return
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => void reload(), 150)
    }, enabled)
}

export function useContacts() {
    const resource = useResource<ContactDto[]>(inboxApi.contactsUrl, { refreshMs: 20000 })
    useLiveReload(resource.reload)
    return resource
}

export function useConversation(contactId: string | null, view: 'office' | 'client' = 'office') {
    const resource = useResource<ConversationDto>(
        contactId ? inboxApi.conversationUrl(contactId, view) : null,
        {
            refreshMs: 15000,
        },
    )
    const { connected } = useLiveReload(resource.reload, Boolean(contactId))
    return { ...resource, live: connected }
}
