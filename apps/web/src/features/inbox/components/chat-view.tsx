import type { ContactDto, EnvelopeDto, MessageDto } from '@lidersign/shared'
import {
    ArrowLeft,
    BellRing,
    Bot,
    Camera,
    Check,
    CheckCheck,
    FileSignature,
    FileText,
    Lock,
    PanelRight,
    Pause,
    Play,
    Reply,
    SendHorizontal,
    Smartphone,
    UserRound,
} from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { Button, cn, errorMessage, formatDateTime, formatTime, Skeleton, Tooltip } from '@lidersign/ui'

import { inboxApi } from '../api'
import { useSpeech } from '../lib/speech'
import { WhatsAppText } from '../lib/whatsapp-text'
import { Avatar } from './avatar'
import { ContractChip } from './contract-chip'

type Note = { kind: 'note'; id: string; at: string; title: string; body: React.ReactNode }
type Entry = { kind: 'message'; message: MessageDto } | Note

function contractNotes(envelope: EnvelopeDto | null): Note[] {
    if (!envelope) return []
    const notes: Note[] = []
    const sent = envelope.sentAt ?? envelope.createdAt
    notes.push({
        kind: 'note',
        id: `${envelope.id}:sent`,
        at: sent,
        title: 'Contrato enviado',
        body: (
            <>
                {envelope.title},{' '}
                {envelope.channel === 'WHATSAPP' ? 'para assinar na própria conversa' : 'por link'}.
            </>
        ),
    })
    if (envelope.identityConfirmedAt) {
        notes.push({
            kind: 'note',
            id: `${envelope.id}:cpf`,
            at: envelope.identityConfirmedAt,
            title: 'CPF confirmado',
            body: <>O CPF digitado confere com o do contrato ({envelope.signer.cpfMasked}).</>,
        })
    }
    if (envelope.signedAt) {
        notes.push({
            kind: 'note',
            id: `${envelope.id}:signed`,
            at: envelope.signedAt,
            title: 'Assinado',
            body: <>O cliente tocou em Assinar. Aceite registrado na trilha de auditoria.</>,
        })
    }
    if (envelope.completedAt) {
        const stamp = envelope.timestamp
        notes.push({
            kind: 'note',
            id: `${envelope.id}:sealed`,
            at: envelope.completedAt,
            title: 'PDF selado',
            body: (
                <>
                    Selo de integridade (PAdES) aplicado.{' '}
                    {stamp.status === 'OK' && stamp.genTime
                        ? `Carimbo do tempo (RFC 3161) emitido por ${stamp.tsa ?? 'autoridade de carimbo'} às ${formatTime(stamp.genTime)}.`
                        : 'Carimbo do tempo indisponível no momento; o selo foi aplicado mesmo assim.'}{' '}
                    Código <span className="font-mono">{envelope.verificationCode}</span>.{' '}
                    <Link
                        to={`/contratos/${envelope.id}`}
                        className="font-medium text-amber-900 underline underline-offset-2"
                    >
                        Ver contrato
                    </Link>
                </>
            ),
        })
    }
    return notes
}

export function ChatView({
    contact,
    messages,
    loading,
    onSendContract,
    onOpenPhone,
    onOpenPanel,
    onBack,
}: {
    contact: ContactDto | undefined
    messages: MessageDto[] | undefined
    loading: boolean
    onSendContract: () => void
    onOpenPhone: () => void
    onOpenPanel: () => void
    onBack: () => void
}) {
    const bottom = React.useRef<HTMLDivElement>(null)
    const speech = useSpeech()
    const [draft, setDraft] = React.useState('')
    const [sending, setSending] = React.useState(false)
    const [nudging, setNudging] = React.useState(false)
    const contract = contact?.contract ?? null
    const open = contract?.status === 'SENT' || contract?.status === 'VIEWED'

    const entries = React.useMemo<Entry[]>(() => {
        const list: Entry[] = [
            ...(messages ?? []).map((message) => ({ kind: 'message' as const, message })),
            ...contractNotes(contract),
        ]
        const time = (entry: Entry) => (entry.kind === 'message' ? entry.message.createdAt : entry.at)
        return list.sort((a, b) => time(a).localeCompare(time(b)))
    }, [messages, contract])

    React.useEffect(() => {
        bottom.current?.scrollIntoView({ block: 'end' })
    }, [entries.length, contact?.id])

    if (!contact) {
        return (
            <section className="flex min-h-0 flex-col items-center justify-center px-6 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-surface">
                    <FileText className="size-5 text-subtle" aria-hidden />
                </span>
                <p className="mt-3 font-medium">Selecione uma conversa</p>
                <p className="mt-1 text-sm text-muted">
                    Escolha uma conversa na lista para ver as mensagens e responder.
                </p>
            </section>
        )
    }

    async function send(event: React.FormEvent) {
        event.preventDefault()
        if (!contact || !draft.trim()) return
        setSending(true)
        try {
            await inboxApi.sendMessage(contact.id, draft.trim())
            setDraft('')
        } catch (error) {
            toast.error(errorMessage(error))
        } finally {
            setSending(false)
        }
    }

    async function nudge() {
        if (!contract) return
        setNudging(true)
        try {
            await inboxApi.nudge(contract.id)
            toast.success('Lembrete enviado na conversa')
        } catch (error) {
            toast.error(errorMessage(error))
        } finally {
            setNudging(false)
        }
    }

    return (
        <section aria-label={`Conversa com ${contact.name}`} className="flex min-h-0 min-w-0 flex-col">
            <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line px-3 sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                    <button
                        type="button"
                        onClick={onBack}
                        aria-label="Voltar para a lista"
                        className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface @3xl:hidden"
                    >
                        <ArrowLeft className="size-4" aria-hidden />
                    </button>
                    <Avatar initials={contact.initials} seed={contact.name} size="sm" whatsapp />
                    <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold">{contact.name}</p>
                        <p className="truncate text-xs text-muted">WhatsApp · {contact.topic}</p>
                    </div>
                    <ContractChip contact={contact} className="hidden @6xl:inline-flex" />
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                    <Tooltip content="Ver no celular do cliente (simulação)">
                        <Button
                            variant="secondary"
                            size="icon"
                            className="size-9"
                            aria-label="Ver no celular do cliente"
                            onClick={onOpenPhone}
                        >
                            <Smartphone aria-hidden />
                        </Button>
                    </Tooltip>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 @min-[960px]:hidden"
                        aria-label="Dados do contato"
                        onClick={onOpenPanel}
                    >
                        <PanelRight aria-hidden />
                    </Button>
                    {open ? (
                        <Button size="sm" variant="secondary" loading={nudging} onClick={() => void nudge()}>
                            <BellRing aria-hidden /> <span className="hidden sm:inline">Lembrar</span>
                        </Button>
                    ) : (
                        <Button size="sm" onClick={onSendContract}>
                            <FileSignature aria-hidden />{' '}
                            <span className="hidden sm:inline">Enviar contrato</span>
                        </Button>
                    )}
                </div>
            </header>

            <div
                className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#fbfbfc] px-4 py-6 scrollbar-thin sm:px-8"
                aria-live="polite"
            >
                {loading && !messages ? (
                    <div className="space-y-4">
                        <Skeleton className="h-14 w-2/3 rounded-2xl" />
                        <Skeleton className="ml-auto h-20 w-1/2 rounded-2xl" />
                        <Skeleton className="h-12 w-1/2 rounded-2xl" />
                    </div>
                ) : (
                    entries.map((entry) =>
                        entry.kind === 'note' ? (
                            <InternalNote key={entry.id} note={entry} />
                        ) : (
                            <OfficeBubble key={entry.message.id} message={entry.message} speech={speech} />
                        ),
                    )
                )}
                <div ref={bottom} />
            </div>

            <form onSubmit={send} className="shrink-0 border-t border-line px-3 py-3 sm:px-5">
                <div className="rounded-xl border border-line px-3 py-2 focus-within:border-brand/50">
                    <label htmlFor="mensagem-escritorio" className="sr-only">
                        Mensagem para {contact.name}
                    </label>
                    <textarea
                        id="mensagem-escritorio"
                        rows={1}
                        value={draft}
                        maxLength={2000}
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) void send(event)
                        }}
                        placeholder="Escreva para o cliente"
                        className="block max-h-32 w-full resize-none bg-transparent py-1 text-[15px] outline-none placeholder:text-subtle"
                    />
                    <div className="mt-1 flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-subtle">
                            Enviando pelo WhatsApp do escritório
                        </span>
                        <Button type="submit" size="sm" loading={sending} disabled={!draft.trim()}>
                            <SendHorizontal aria-hidden /> Enviar
                        </Button>
                    </div>
                </div>
            </form>
        </section>
    )
}

function author(message: MessageDto) {
    if (message.payload?.author === 'team') return { label: 'Você', icon: UserRound }
    if (message.payload?.author === 'agent') return { label: 'Agente de IA · SDR', icon: Bot }
    return { label: 'Agente de contratos', icon: Bot }
}

function OfficeBubble({ message, speech }: { message: MessageDto; speech: ReturnType<typeof useSpeech> }) {
    const outgoing = message.direction === 'OUT'
    const who = author(message)
    const Icon = who.icon
    return (
        <div className={cn('flex items-end gap-2', outgoing ? 'justify-end' : 'justify-start')}>
            <div
                className={cn(
                    'flex max-w-[85%] flex-col sm:max-w-[70%]',
                    outgoing ? 'items-end' : 'items-start',
                )}
            >
                <div
                    className={cn(
                        'rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed',
                        outgoing
                            ? 'rounded-br-md bg-[#eef2f9] text-ink'
                            : 'rounded-bl-md border border-line bg-white',
                    )}
                >
                    <BubbleContent message={message} speech={speech} />
                </div>
                <p className="mt-1 flex items-center gap-1 px-1 text-[11px] text-subtle tabular">
                    {outgoing ? (
                        <>
                            {message.status === 'FAILED' ? (
                                <span className="text-red-600">Falhou</span>
                            ) : (
                                <CheckCheck className="size-3.5" aria-hidden />
                            )}
                            {who.label} · {formatDateTime(message.createdAt)}
                        </>
                    ) : message.type === 'BUTTONS' ? (
                        <>
                            <Reply className="size-3" aria-hidden /> Tocou no botão ·{' '}
                            {formatTime(message.createdAt)}
                        </>
                    ) : (
                        formatTime(message.createdAt)
                    )}
                </p>
            </div>
            {outgoing ? (
                <span className="mb-5 flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                    <Icon className="size-3.5" aria-hidden />
                </span>
            ) : null}
        </div>
    )
}

function BubbleContent({ message, speech }: { message: MessageDto; speech: ReturnType<typeof useSpeech> }) {
    const payload = message.payload ?? {}
    if (message.type === 'DOCUMENT' && payload.document) {
        return (
            <div className="space-y-2">
                <a
                    href={message.url ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-[220px] items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5 hover:bg-surface"
                >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-[10px] font-bold text-red-600">
                        PDF
                    </span>
                    <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                            {payload.document.filename}
                        </span>
                        <span className="block text-xs text-muted">
                            {payload.document.file === 'signed'
                                ? 'Via assinada e selada'
                                : 'Documento para assinar'}
                        </span>
                    </span>
                </a>
                <p>{message.body}</p>
            </div>
        )
    }
    if (message.type === 'AUDIO' && payload.audio) {
        const playing = speech.playing === message.id
        return (
            <div className="min-w-[240px] space-y-2">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() =>
                            playing ? speech.stop() : speech.play(message.id, payload.audio!.text)
                        }
                        disabled={!speech.supported}
                        aria-label={playing ? 'Pausar o resumo' : 'Ouvir o resumo'}
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {playing ? (
                            <Pause className="size-4" aria-hidden />
                        ) : (
                            <Play className="size-4" aria-hidden />
                        )}
                    </button>
                    <Waveform active={playing} />
                    <span className="text-xs text-muted tabular">
                        0:{String(payload.audio.seconds).padStart(2, '0')}
                    </span>
                </div>
                <p className="text-[13px] leading-relaxed text-muted">
                    <span className="font-medium text-ink/70">Transcrição: </span>
                    {payload.audio.text}
                </p>
            </div>
        )
    }
    if (message.type === 'BUTTONS' && payload.buttons?.length && message.direction === 'OUT') {
        return (
            <div className="space-y-2.5">
                <p>
                    <WhatsAppText text={message.body} />
                </p>
                <div className="flex flex-wrap gap-1.5">
                    {payload.buttons.map((button) => (
                        <span
                            key={button.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-line bg-white px-2.5 py-1 text-[13px] font-medium text-emerald-700"
                        >
                            <Reply className="size-3" aria-hidden /> {button.title}
                        </span>
                    ))}
                </div>
            </div>
        )
    }
    if (message.type === 'IMAGE') {
        return (
            <p className="flex items-center gap-2 text-muted">
                <Camera className="size-4" aria-hidden /> {message.body || 'Foto'}
                <span className="text-xs">(guardada nas evidências)</span>
            </p>
        )
    }
    return (
        <p className="break-words">
            <WhatsAppText
                text={message.body}
                linkClassName="break-all text-brand underline underline-offset-2"
            />
        </p>
    )
}

function Waveform({ active }: { active: boolean }) {
    const bars = [6, 12, 8, 16, 10, 18, 7, 14, 9, 17, 6, 12, 15, 8, 11, 16, 7, 10]
    return (
        <span aria-hidden className="flex h-6 flex-1 items-center gap-[3px]">
            {bars.map((height, index) => (
                <span
                    key={index}
                    style={{ height }}
                    className={cn(
                        'w-[3px] rounded-full',
                        active ? 'bg-emerald-600 motion-safe:animate-pulse' : 'bg-ink/25',
                    )}
                />
            ))}
        </span>
    )
}

function InternalNote({ note }: { note: Note }) {
    return (
        <div className="flex justify-end pr-9">
            <div className="max-w-[85%] sm:max-w-[70%]">
                <p className="mb-1 flex items-center justify-end gap-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">
                    <Lock className="size-3" aria-hidden /> Nota interna · Contratos
                </p>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-2.5 text-sm leading-relaxed text-amber-950/85">
                    <p className="flex items-center gap-1.5 font-semibold text-amber-950">
                        <Check className="size-3.5" aria-hidden /> {note.title}
                    </p>
                    <p className="mt-0.5">{note.body}</p>
                </div>
                <p className="mt-1 px-1 text-right text-[11px] text-subtle tabular">
                    {formatDateTime(note.at)}
                </p>
            </div>
        </div>
    )
}

export { BubbleContent, Waveform }
