import type { AssistantAction, AssistantReply } from '@lidersign/shared'
import * as React from 'react'
import { useLocation } from 'react-router'

import { errorMessage } from '@lidersign/ui'

import { TEMPLATES_CHANGED } from '@/features/templates'

import { assistantApi } from './api'

export type AssistantPage = 'atendimento' | 'contratos' | 'modelos' | 'configuracoes'

export type ChatItem =
    | { id: string; role: 'user'; text: string; attachment?: string }
    | {
          id: string
          role: 'assistant'
          text: string
          actions: AssistantAction[]
          thoughtMs: number
          lookups: number
          steps: string[]
          engine: AssistantReply['engine']
          failed?: boolean
      }

type AssistantValue = {
    open: boolean
    expanded: boolean
    page: AssistantPage
    items: ChatItem[]
    pending: boolean
    setOpen: (open: boolean) => void
    toggleExpanded: () => void
    ask: (text: string) => Promise<void>
    attach: (file: File) => Promise<void>
    reset: () => void
    requestFile: () => void
    registerFilePicker: (open: () => void) => void
}

const AssistantContext = React.createContext<AssistantValue | null>(null)
const MAX_FILE = 5 * 1024 * 1024

function pageFrom(pathname: string): AssistantPage {
    if (pathname.startsWith('/contratos')) return 'contratos'
    if (pathname.startsWith('/modelos')) return 'modelos'
    if (pathname.startsWith('/configuracoes')) return 'configuracoes'
    return 'atendimento'
}

let counter = 0
const nextId = () => `m${Date.now().toString(36)}${(counter++).toString(36)}`

export function AssistantProvider({ children }: { children: React.ReactNode }) {
    const { pathname } = useLocation()
    const page = pageFrom(pathname)
    const [open, setOpen] = React.useState(false)
    const [expanded, setExpanded] = React.useState(false)
    const [items, setItems] = React.useState<ChatItem[]>([])
    const [pending, setPending] = React.useState(false)
    const picker = React.useRef<(() => void) | null>(null)
    const itemsRef = React.useRef(items)
    itemsRef.current = items

    const reply = React.useCallback((result: AssistantReply) => {
        if (result.actions.some((action) => action.type === 'template.created')) {
            window.dispatchEvent(new Event(TEMPLATES_CHANGED))
        }
        setItems((current) => [
            ...current,
            {
                id: nextId(),
                role: 'assistant',
                text: result.reply,
                actions: result.actions,
                thoughtMs: result.thoughtMs,
                lookups: result.lookups,
                steps: result.steps ?? [],
                engine: result.engine,
            },
        ])
    }, [])

    const fail = React.useCallback((error: unknown) => {
        setItems((current) => [
            ...current,
            {
                id: nextId(),
                role: 'assistant',
                text: errorMessage(error),
                actions: [],
                thoughtMs: 0,
                lookups: 0,
                steps: [],
                engine: 'scripted',
                failed: true,
            },
        ])
    }, [])

    const ask = React.useCallback(
        async (text: string) => {
            const message = text.trim()
            if (!message) return
            setOpen(true)
            const history = itemsRef.current
                .filter((item) => !(item.role === 'assistant' && item.failed))
                .slice(-10)
                .map((item) => ({ role: item.role, text: item.text.slice(0, 4000) }))
            setItems((current) => [...current, { id: nextId(), role: 'user', text: message }])
            setPending(true)
            try {
                reply(await assistantApi.ask({ message, page, history }))
            } catch (error) {
                fail(error)
            } finally {
                setPending(false)
            }
        },
        [page, reply, fail],
    )

    const attach = React.useCallback(
        async (file: File) => {
            setOpen(true)
            setItems((current) => [
                ...current,
                {
                    id: nextId(),
                    role: 'user',
                    text: 'Quero um novo modelo de contrato com este exemplo',
                    attachment: file.name,
                },
            ])
            if (file.size > MAX_FILE) {
                fail(new Error('O arquivo pode ter no máximo 5 MB.'))
                return
            }
            setPending(true)
            try {
                reply(await assistantApi.createTemplate(file))
            } catch (error) {
                fail(error)
            } finally {
                setPending(false)
            }
        },
        [reply, fail],
    )

    const value = React.useMemo<AssistantValue>(
        () => ({
            open,
            expanded,
            page,
            items,
            pending,
            setOpen,
            toggleExpanded: () => setExpanded((current) => !current),
            ask,
            attach,
            reset: () => setItems([]),
            requestFile: () => {
                setOpen(true)
                window.setTimeout(() => picker.current?.(), 50)
            },
            registerFilePicker: (openPicker) => {
                picker.current = openPicker
            },
        }),
        [open, expanded, page, items, pending, ask, attach],
    )
    return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>
}

export function useAssistant() {
    const value = React.useContext(AssistantContext)
    if (!value) throw new Error('useAssistant fora do AssistantProvider')
    return value
}

export const SUGGESTIONS: Record<AssistantPage, { label: string; prompt?: string; file?: true }[]> = {
    atendimento: [
        { label: 'Quem ainda não assinou?', prompt: 'Quem ainda não assinou?' },
        { label: 'Lembre quem parou', prompt: 'Lembre quem parou de assinar' },
        { label: 'Criar modelo a partir de um PDF', file: true },
    ],
    contratos: [
        { label: 'Qual a taxa de fechamento?', prompt: 'Qual a taxa de fechamento, comparada ao ZapSign?' },
        { label: 'Quem ainda não assinou?', prompt: 'Quem ainda não assinou?' },
        { label: 'Lembre quem parou', prompt: 'Lembre quem parou de assinar' },
    ],
    modelos: [
        { label: 'Criar modelo a partir de um PDF', file: true },
        { label: 'Quais modelos eu tenho?', prompt: 'Quais modelos eu tenho?' },
    ],
    configuracoes: [
        { label: 'Quais modelos eu tenho?', prompt: 'Quais modelos eu tenho?' },
        { label: 'Qual a taxa de fechamento?', prompt: 'Qual a taxa de fechamento?' },
    ],
}
