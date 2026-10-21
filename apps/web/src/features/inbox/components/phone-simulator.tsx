import type { ContactDto, MessageDto, SimulatorInboundInput } from '@lidersign/shared'
import {
    ArrowLeft,
    Camera,
    CheckCheck,
    ImageUp,
    Pause,
    Play,
    Reply,
    SendHorizontal,
    Sparkles,
    UserRound,
} from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { cn, errorMessage, formatTime, LogoMark, Skeleton } from '@lidersign/ui'

import { inboxApi } from '../api'
import { fileToDataUrl, sampleSelfie } from '../lib/sample-selfie'
import { useSpeech } from '../lib/speech'
import { WhatsAppText } from '../lib/whatsapp-text'

/**
 * O WhatsApp do cliente, simulado. Cada toque vira uma mensagem de entrada no mesmo motor
 * que, em produção, recebe o webhook da Meta.
 */
export function PhoneSimulator({
    contact,
    officeName,
    messages,
    loading,
}: {
    contact: ContactDto
    officeName: string
    messages: MessageDto[] | undefined
    loading: boolean
}) {
    const speech = useSpeech()
    const [draft, setDraft] = React.useState('')
    const [waiting, setWaiting] = React.useState(false)
    const [camera, setCamera] = React.useState(false)
    const [transcripts, setTranscripts] = React.useState<Set<string>>(new Set())
    const [localImages, setLocalImages] = React.useState<string[]>([])
    const file = React.useRef<HTMLInputElement>(null)
    const bottom = React.useRef<HTMLDivElement>(null)
    const list = messages ?? []
    const lastButtons = [...list]
        .reverse()
        .find((message) => message.direction === 'OUT' && message.type === 'BUTTONS')
    const lastOut = [...list].reverse().find((message) => message.direction === 'OUT')

    React.useEffect(() => {
        bottom.current?.scrollIntoView({ block: 'end' })
    }, [list.length, waiting])

    React.useEffect(() => {
        if (!waiting) return
        const timer = window.setTimeout(() => setWaiting(false), 6000)
        return () => window.clearTimeout(timer)
    }, [waiting])

    React.useEffect(() => {
        setWaiting(false)
    }, [lastOut?.id])

    async function inbound(input: SimulatorInboundInput) {
        setWaiting(true)
        try {
            await inboxApi.simulate(input)
        } catch (error) {
            setWaiting(false)
            toast.error(errorMessage(error))
        }
    }

    function sendText(event: React.FormEvent) {
        event.preventDefault()
        const text = draft.trim()
        if (!text) return
        setDraft('')
        void inbound({ type: 'text', contactId: contact.id, text })
    }

    async function sendImage(dataUrl: string) {
        setCamera(false)
        if (!dataUrl) return
        setLocalImages((current) => [...current, dataUrl])
        await inbound({ type: 'image', contactId: contact.id, imageDataUrl: dataUrl })
    }

    const imageIds = list
        .filter((message) => message.type === 'IMAGE' && message.direction === 'IN')
        .map((message) => message.id)
    const imageFor = (id: string) =>
        localImages[imageIds.indexOf(id) - (imageIds.length - localImages.length)]
    const first = contact.name.split(' ')[0]

    return (
        <div className="flex h-full flex-col items-center gap-3 px-4 py-4">
            <div className="w-full max-w-[340px]">
                <p className="text-sm font-semibold">Celular de {first} (simulado)</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
                    O que o cliente vê no WhatsApp. Toque nos botões como ele tocaria.
                </p>
            </div>

            <div className="flex min-h-[520px] w-full max-w-[340px] flex-1 flex-col overflow-hidden rounded-[30px] border-[6px] border-ink bg-[#efeae2]">
                <div className="flex items-center justify-between bg-[#008069] px-4 pb-1 pt-2 text-[11px] font-medium text-white/90 tabular">
                    <span>{formatTime(new Date())}</span>
                    <span aria-hidden>●●● 4G</span>
                </div>
                <div className="flex items-center gap-2.5 bg-[#008069] px-3 pb-2.5 text-white">
                    <ArrowLeft className="size-4 opacity-90" aria-hidden />
                    <LogoMark inverted className="size-8 rounded-full" />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{officeName}</p>
                        <p className="text-[11px] text-white/80">
                            {waiting ? 'digitando…' : 'Conta comercial'}
                        </p>
                    </div>
                </div>

                <div
                    className="min-h-0 flex-1 space-y-2 overflow-y-auto px-2.5 py-3 scrollbar-thin"
                    aria-live="polite"
                >
                    {loading && !messages ? (
                        <div className="space-y-2">
                            <Skeleton className="h-12 w-3/4 rounded-xl bg-white/70" />
                            <Skeleton className="ml-auto h-10 w-1/2 rounded-xl bg-white/70" />
                        </div>
                    ) : null}
                    {list.map((message) => {
                        const incoming = message.direction === 'OUT'
                        const payload = message.payload ?? {}
                        const image =
                            message.type === 'IMAGE' && message.direction === 'IN'
                                ? imageFor(message.id)
                                : undefined
                        return (
                            <div
                                key={message.id}
                                className={cn('flex flex-col', incoming ? 'items-start' : 'items-end')}
                            >
                                <div
                                    className={cn(
                                        'max-w-[86%] rounded-lg px-2.5 py-1.5 text-[14px] leading-snug text-[#111b21] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]',
                                        incoming
                                            ? 'rounded-tl-none bg-white'
                                            : 'rounded-tr-none bg-[#d9fdd3]',
                                    )}
                                >
                                    {message.type === 'DOCUMENT' && payload.document ? (
                                        <a
                                            href={message.url ?? '#'}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="-mx-1 mb-1 flex items-center gap-2.5 rounded-md bg-[#f5f6f6] px-2.5 py-2"
                                        >
                                            <span className="flex size-9 shrink-0 items-center justify-center rounded bg-red-600 text-[10px] font-bold text-white">
                                                PDF
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block truncate text-[13px] font-medium">
                                                    {payload.document.filename}
                                                </span>
                                                <span className="block text-[11px] text-[#667781]">
                                                    Toque para abrir
                                                </span>
                                            </span>
                                        </a>
                                    ) : null}
                                    {message.type === 'AUDIO' && payload.audio ? (
                                        <div className="w-[230px] py-1">
                                            <div className="flex items-center gap-2.5">
                                                <button
                                                    type="button"
                                                    disabled={!speech.supported}
                                                    onClick={() =>
                                                        speech.playing === message.id
                                                            ? speech.stop()
                                                            : speech.play(message.id, payload.audio!.text)
                                                    }
                                                    aria-label={
                                                        speech.playing === message.id
                                                            ? 'Pausar áudio'
                                                            : 'Ouvir áudio'
                                                    }
                                                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white"
                                                >
                                                    {speech.playing === message.id ? (
                                                        <Pause className="size-4" aria-hidden />
                                                    ) : (
                                                        <Play className="size-4" aria-hidden />
                                                    )}
                                                </button>
                                                <span
                                                    aria-hidden
                                                    className="flex h-6 flex-1 items-center gap-[2px]"
                                                >
                                                    {[
                                                        5, 11, 7, 14, 9, 16, 6, 13, 8, 15, 6, 10, 14, 7, 12,
                                                        9,
                                                    ].map((height, index) => (
                                                        <span
                                                            key={index}
                                                            style={{ height }}
                                                            className={cn(
                                                                'w-[3px] rounded-full',
                                                                speech.playing === message.id
                                                                    ? 'bg-[#00a884] motion-safe:animate-pulse'
                                                                    : 'bg-[#8696a0]',
                                                            )}
                                                        />
                                                    ))}
                                                </span>
                                                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#dfe5e7]">
                                                    <Sparkles
                                                        className="size-3.5 text-[#54656f]"
                                                        aria-hidden
                                                    />
                                                </span>
                                            </div>
                                            <div className="mt-1 flex items-center justify-between text-[11px] text-[#667781] tabular">
                                                <span>
                                                    0:{String(payload.audio.seconds).padStart(2, '0')}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setTranscripts((current) => {
                                                            const next = new Set(current)
                                                            if (next.has(message.id)) next.delete(message.id)
                                                            else next.add(message.id)
                                                            return next
                                                        })
                                                    }
                                                    className="underline underline-offset-2"
                                                >
                                                    {transcripts.has(message.id)
                                                        ? 'Ocultar texto'
                                                        : 'Ver texto'}
                                                </button>
                                            </div>
                                            {transcripts.has(message.id) ? (
                                                <p className="mt-1.5 text-[13px] leading-snug text-[#3b4a54]">
                                                    {payload.audio.text}
                                                </p>
                                            ) : null}
                                        </div>
                                    ) : null}
                                    {message.type === 'IMAGE' ? (
                                        image ? (
                                            <img
                                                src={image}
                                                alt="Selfie enviada"
                                                className="-mx-1 mb-1 h-40 w-32 rounded-md object-cover"
                                            />
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-[#54656f]">
                                                <Camera className="size-4" aria-hidden /> Foto
                                            </span>
                                        )
                                    ) : null}
                                    {message.type !== 'AUDIO' && message.type !== 'IMAGE' ? (
                                        <p className="whitespace-pre-wrap break-words">
                                            <WhatsAppText text={message.body} />
                                        </p>
                                    ) : null}
                                    <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-[#667781] tabular">
                                        {formatTime(message.createdAt)}
                                        {incoming ? null : (
                                            <CheckCheck className="size-3.5 text-[#53bdeb]" aria-hidden />
                                        )}
                                    </p>
                                </div>
                                {message.type === 'BUTTONS' && incoming && payload.buttons?.length ? (
                                    <div className="mt-1 flex w-[86%] flex-col gap-1">
                                        {payload.buttons.map((button) => {
                                            const active = message.id === lastButtons?.id && !waiting
                                            return (
                                                <button
                                                    key={button.id}
                                                    type="button"
                                                    disabled={!active}
                                                    onClick={() =>
                                                        void inbound({
                                                            type: 'button',
                                                            contactId: contact.id,
                                                            buttonId: button.id,
                                                        })
                                                    }
                                                    className={cn(
                                                        'flex h-10 items-center justify-center gap-1.5 rounded-lg bg-white text-[14px] font-medium text-[#008069] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] transition-colors',
                                                        active ? 'hover:bg-[#f5f6f6]' : 'opacity-55',
                                                    )}
                                                >
                                                    <Reply className="size-4" aria-hidden /> {button.title}
                                                </button>
                                            )
                                        })}
                                    </div>
                                ) : null}
                            </div>
                        )
                    })}
                    {waiting ? (
                        <div className="flex">
                            <span className="rounded-lg rounded-tl-none bg-white px-3 py-2 text-[13px] text-[#667781] shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]">
                                digitando…
                            </span>
                        </div>
                    ) : null}
                    <div ref={bottom} />
                </div>

                <div className="relative px-2 pb-2 pt-1">
                    {camera ? (
                        <div className="absolute bottom-14 left-2 right-2 z-10 overflow-hidden rounded-xl bg-white p-1 shadow-[0_4px_16px_rgba(11,20,26,0.2)] animate-pop">
                            <button
                                type="button"
                                onClick={() => void sendImage(sampleSelfie())}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm hover:bg-[#f5f6f6]"
                            >
                                <UserRound className="size-4 text-[#008069]" aria-hidden /> Enviar selfie de
                                exemplo
                            </button>
                            <button
                                type="button"
                                onClick={() => file.current?.click()}
                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm hover:bg-[#f5f6f6]"
                            >
                                <ImageUp className="size-4 text-[#008069]" aria-hidden /> Tirar ou escolher
                                foto
                            </button>
                        </div>
                    ) : null}
                    <form onSubmit={sendText} className="flex items-center gap-1.5">
                        <div className="flex h-10 min-w-0 flex-1 items-center gap-1 rounded-full bg-white pl-4 pr-1">
                            <label htmlFor="mensagem-cliente" className="sr-only">
                                Mensagem do cliente
                            </label>
                            <input
                                id="mensagem-cliente"
                                value={draft}
                                onChange={(event) => setDraft(event.target.value)}
                                placeholder="Mensagem"
                                maxLength={2000}
                                autoComplete="off"
                                className="min-w-0 flex-1 bg-transparent text-[14px] text-[#111b21] outline-none placeholder:text-[#8696a0]"
                            />
                            <button
                                type="button"
                                onClick={() => setCamera((value) => !value)}
                                aria-label="Câmera"
                                aria-expanded={camera}
                                className="flex size-8 items-center justify-center rounded-full text-[#54656f] hover:bg-[#f0f2f5]"
                            >
                                <Camera className="size-[18px]" aria-hidden />
                            </button>
                        </div>
                        <button
                            type="submit"
                            aria-label="Enviar mensagem"
                            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white"
                        >
                            <SendHorizontal className="size-[18px]" aria-hidden />
                        </button>
                    </form>
                    <input
                        ref={file}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        capture="user"
                        className="sr-only"
                        tabIndex={-1}
                        aria-label="Foto"
                        onChange={(event) => {
                            const chosen = event.target.files?.[0]
                            event.target.value = ''
                            if (!chosen) return
                            if (chosen.size > 5 * 1024 * 1024) {
                                toast.error('A foto pode ter no máximo 5 MB.')
                                return
                            }
                            void fileToDataUrl(chosen)
                                .then(sendImage)
                                .catch((error) => toast.error(errorMessage(error)))
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
