import {
    ArrowUp,
    Brain,
    Check,
    ChevronDown,
    Copy,
    FileText,
    Maximize2,
    Mic,
    Minimize2,
    Paperclip,
    Plus,
    Sparkles,
    X,
} from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { cn } from '@lidersign/ui'

import { SUGGESTIONS, useAssistant, type ChatItem } from '../context'
import { RichText } from './rich-text'

const ACCEPT =
    '.pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'

type SpeechRecognitionLike = {
    lang: string
    interimResults: boolean
    onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
    onend: (() => void) | null
    start: () => void
    stop: () => void
}

function speechRecognition(): (new () => SpeechRecognitionLike) | null {
    if (typeof window === 'undefined') return null
    const w = window as unknown as Record<string, unknown>
    return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as
        | (new () => SpeechRecognitionLike)
        | null
}

function seconds(ms: number) {
    return Math.max(1, Math.round(ms / 1000))
}

export function AssistantPanel() {
    const assistant = useAssistant()
    const {
        open,
        expanded,
        items,
        pending,
        page,
        setOpen,
        toggleExpanded,
        reset,
        ask,
        attach,
        registerFilePicker,
    } = assistant
    const [draft, setDraft] = React.useState('')
    const [listening, setListening] = React.useState(false)
    const file = React.useRef<HTMLInputElement>(null)
    const input = React.useRef<HTMLTextAreaElement>(null)
    const bottom = React.useRef<HTMLDivElement>(null)
    const recognition = React.useRef<SpeechRecognitionLike | null>(null)
    const Speech = React.useMemo(speechRecognition, [])

    React.useEffect(() => {
        registerFilePicker(() => file.current?.click())
    }, [registerFilePicker])

    React.useEffect(() => {
        if (open) window.setTimeout(() => input.current?.focus(), 60)
    }, [open])

    React.useEffect(() => {
        bottom.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
    }, [items.length, pending])

    if (!open) return null

    const firstQuestion = items.find((item) => item.role === 'user')?.text
    const title = firstQuestion ?? 'Pergunte ao Assistente'

    function submit(event?: React.FormEvent) {
        event?.preventDefault()
        if (pending || !draft.trim()) return
        void ask(draft)
        setDraft('')
    }

    function dictate() {
        if (!Speech) return
        if (listening) {
            recognition.current?.stop()
            return
        }
        const instance = new Speech()
        instance.lang = 'pt-BR'
        instance.interimResults = false
        instance.onresult = (event) => {
            const text = Array.from(event.results)
                .map((result) => result[0]?.transcript ?? '')
                .join(' ')
            setDraft((current) => `${current ? `${current} ` : ''}${text}`.trim())
        }
        instance.onend = () => setListening(false)
        recognition.current = instance
        setListening(true)
        instance.start()
    }

    return (
        <aside
            aria-label="Assistente"
            className={cn(
                'fixed inset-0 z-50 flex flex-col bg-white lg:static lg:inset-auto lg:z-auto lg:h-full lg:shrink-0 lg:border-l lg:border-line',
                expanded ? 'lg:w-[560px]' : 'lg:w-[400px]',
            )}
        >
            <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-4">
                <p className="min-w-0 flex-1 truncate text-sm font-semibold" title={title}>
                    {title}
                </p>
                <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[11px] font-semibold text-brand">
                    Beta
                </span>
                <IconButton
                    label={expanded ? 'Reduzir' : 'Expandir'}
                    onClick={toggleExpanded}
                    className="hidden lg:flex"
                >
                    {expanded ? <Minimize2 /> : <Maximize2 />}
                </IconButton>
                <IconButton label="Nova conversa" onClick={reset}>
                    <Plus />
                </IconButton>
                <IconButton label="Fechar o Assistente" onClick={() => setOpen(false)}>
                    <X />
                </IconButton>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 scrollbar-thin" aria-live="polite">
                {items.length === 0 ? (
                    <Welcome />
                ) : (
                    <div className="space-y-6">
                        {items.map((item) => (
                            <Item
                                key={item.id}
                                item={item}
                                onNavigate={() => setOpen(window.innerWidth >= 1024)}
                            />
                        ))}
                        {pending ? (
                            <p className="flex items-center gap-2 text-sm text-muted">
                                <Brain className="size-4 animate-pulse" aria-hidden /> Pensando…
                            </p>
                        ) : null}
                    </div>
                )}
                <div ref={bottom} />
            </div>

            <div className="shrink-0 px-4 pb-3">
                {items.length === 0 ? (
                    <div className="mb-3 flex flex-wrap gap-2">
                        {SUGGESTIONS[page].map((suggestion) => (
                            <button
                                key={suggestion.label}
                                type="button"
                                disabled={pending}
                                onClick={() =>
                                    suggestion.file
                                        ? file.current?.click()
                                        : void ask(suggestion.prompt ?? suggestion.label)
                                }
                                className="rounded-full border border-line bg-white px-3 py-1.5 text-[13px] text-ink/80 transition-colors hover:border-line-strong hover:bg-surface disabled:opacity-50"
                            >
                                {suggestion.file ? (
                                    <Paperclip className="mr-1 inline size-3.5" aria-hidden />
                                ) : null}
                                {suggestion.label}
                            </button>
                        ))}
                    </div>
                ) : null}
                <form
                    onSubmit={submit}
                    className="rounded-2xl border border-line-strong bg-white px-3 pb-2 pt-3 focus-within:border-brand/60"
                >
                    <label htmlFor="assistente-pergunta" className="sr-only">
                        Pergunta para o Assistente
                    </label>
                    <textarea
                        id="assistente-pergunta"
                        ref={input}
                        rows={2}
                        value={draft}
                        maxLength={2000}
                        placeholder="Pergunte sobre contratos, clientes ou modelos"
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) submit(event)
                        }}
                        className="block w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-subtle"
                    />
                    <div className="mt-1 flex items-center gap-1">
                        <IconButton
                            label="Anexar contrato (PDF, Word ou texto)"
                            onClick={() => file.current?.click()}
                        >
                            <Paperclip />
                        </IconButton>
                        {Speech ? (
                            <IconButton
                                label={listening ? 'Parar o ditado' : 'Ditar pergunta'}
                                onClick={dictate}
                                className={listening ? 'bg-red-50 text-red-600 hover:bg-red-50' : undefined}
                            >
                                <Mic />
                            </IconButton>
                        ) : null}
                        <button
                            type="submit"
                            disabled={pending || !draft.trim()}
                            aria-label="Enviar pergunta"
                            className="ml-auto flex size-9 items-center justify-center rounded-xl bg-brand text-white transition-colors hover:bg-brand-hover disabled:bg-line disabled:text-subtle"
                        >
                            <ArrowUp className="size-4" aria-hidden />
                        </button>
                    </div>
                </form>
                <p className="mt-2 text-center text-xs text-subtle">
                    O Assistente pode errar. Confira os dados importantes.
                </p>
                <input
                    ref={file}
                    type="file"
                    accept={ACCEPT}
                    className="sr-only"
                    tabIndex={-1}
                    aria-label="Arquivo do contrato"
                    onChange={(event) => {
                        const chosen = event.target.files?.[0]
                        if (chosen) void attach(chosen)
                        event.target.value = ''
                    }}
                />
            </div>
        </aside>
    )
}

function Welcome() {
    return (
        <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Sparkles className="size-5" aria-hidden />
            </span>
            <p className="mt-4 text-[17px] font-semibold tracking-[-0.02em]">Como posso ajudar?</p>
            <p className="mt-1.5 max-w-[30ch] text-sm leading-relaxed text-muted">
                Consulto os seus contratos, lembro quem parou e crio modelos a partir de um PDF.
            </p>
        </div>
    )
}

function Item({ item, onNavigate }: { item: ChatItem; onNavigate: () => void }) {
    if (item.role === 'user') {
        return (
            <div className="flex justify-end">
                <div className="max-w-[85%] space-y-2">
                    {item.attachment ? (
                        <p className="ml-auto flex w-fit items-center gap-2 rounded-xl border border-line bg-white px-3 py-2 text-[13px]">
                            <FileText className="size-4 text-brand" aria-hidden />
                            <span className="max-w-[220px] truncate">{item.attachment}</span>
                        </p>
                    ) : null}
                    <p className="rounded-2xl bg-surface px-4 py-2.5 text-[15px] leading-relaxed">
                        {item.text}
                    </p>
                </div>
            </div>
        )
    }
    return (
        <div className="space-y-2.5">
            {item.failed ? null : <Thinking item={item} />}
            {item.failed ? (
                <p className="text-[15px] text-red-700">{item.text}</p>
            ) : (
                <RichText text={item.text} onNavigate={onNavigate} />
            )}
            {item.actions.some((action) => action.type === 'navigate') ? (
                <div className="flex flex-wrap gap-2 pt-1">
                    {item.actions.map((action) =>
                        action.type === 'navigate' ? (
                            <Link
                                key={action.to}
                                to={action.to}
                                onClick={onNavigate}
                                className="rounded-lg border border-line px-2.5 py-1.5 text-[13px] font-medium text-ink/80 transition-colors hover:bg-surface"
                            >
                                {action.label}
                            </Link>
                        ) : null,
                    )}
                </div>
            ) : null}
            {item.failed ? null : (
                <button
                    type="button"
                    aria-label="Copiar resposta"
                    onClick={() => {
                        void navigator.clipboard
                            ?.writeText(
                                item.text.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1'),
                            )
                            .then(() => toast('Resposta copiada'))
                            .catch(() => undefined)
                    }}
                    className="flex size-8 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-surface hover:text-ink"
                >
                    <Copy className="size-4" aria-hidden />
                </button>
            )}
        </div>
    )
}

function Thinking({ item }: { item: Extract<ChatItem, { role: 'assistant' }> }) {
    const [open, setOpen] = React.useState(false)
    const label = `Pensou por ${seconds(item.thoughtMs)} s${
        item.lookups ? ` · ${item.lookups} ${item.lookups === 1 ? 'consulta' : 'consultas'}` : ''
    }`
    if (!item.steps.length) {
        return (
            <p className="flex items-center gap-1.5 text-[13px] text-muted">
                <Brain className="size-4" aria-hidden /> {label}
            </p>
        )
    }
    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                className="flex items-center gap-1.5 rounded-md text-[13px] text-muted transition-colors hover:text-ink"
            >
                <Brain className="size-4" aria-hidden /> {label}
                <ChevronDown
                    className={cn('size-3.5 transition-transform', open && 'rotate-180')}
                    aria-hidden
                />
            </button>
            {open ? (
                <ul className="mt-2 space-y-1.5 border-l border-line pl-3">
                    {item.steps.map((step, index) => (
                        <li key={index} className="flex items-center gap-1.5 text-[13px] text-muted">
                            <Check className="size-3.5 text-emerald-600" aria-hidden /> {step}
                        </li>
                    ))}
                    {item.engine === 'scripted' ? (
                        <li className="text-xs text-subtle">
                            Sem chave de IA configurada: respondeu pelo roteiro reserva.
                        </li>
                    ) : null}
                </ul>
            ) : null}
        </div>
    )
}

function IconButton({
    label,
    onClick,
    children,
    className,
}: {
    label: string
    onClick: () => void
    children: React.ReactNode
    className?: string
}) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            onClick={onClick}
            className={cn(
                'flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-ink [&_svg]:size-4',
                className,
            )}
        >
            {children}
        </button>
    )
}
