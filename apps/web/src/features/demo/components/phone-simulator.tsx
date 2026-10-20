import type { MessageDto, StreamEvent } from '@lidersign/shared'
import { ArrowLeft, ArrowRight, BatteryFull, CheckCheck, Lock, Mic, Signal, Wifi } from 'lucide-react'
import * as React from 'react'

import { LogoMark } from '@/features/brand'
import { useLiveEvents } from '@/features/realtime'
import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/format'
import { useResource } from '@/lib/use-resource'

import { demoApi } from '../api'

type WebTarget = { path: string; label: string }

const URL_PATTERN = /(https?:\/\/[^\s]+)/g

/** Links do LíderSign abrem dentro do celular; o resto abre numa aba nova. */
function internalPath(url: string): { path: string; label: string } | null {
    try {
        const parsed = new URL(url.replace(/[.,;:!?)]+$/, ''))
        if (parsed.pathname.startsWith('/s/')) return { path: parsed.pathname, label: 'Assinar documento' }
        if (parsed.pathname.startsWith('/v/')) return { path: parsed.pathname, label: 'Verificação' }
        return null
    } catch {
        return null
    }
}

function MessageText({ body, onOpen }: { body: string; onOpen: (target: { path: string; label: string }) => void }) {
    const parts = body.split(URL_PATTERN)
    return (
        <p className="whitespace-pre-wrap break-words">
            {parts.map((part, index) => {
                if (index % 2 === 0) return <React.Fragment key={index}>{part}</React.Fragment>
                const trailing = part.match(/[.,;:!?)]+$/)?.[0] ?? ''
                const url = trailing ? part.slice(0, -trailing.length) : part
                const target = internalPath(url)
                return (
                    <React.Fragment key={index}>
                        <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(event) => {
                                if (!target) return
                                event.preventDefault()
                                onOpen(target)
                            }}
                            className="break-all text-chat-link underline underline-offset-2"
                        >
                            {url}
                        </a>
                        {trailing}
                    </React.Fragment>
                )
            })}
        </p>
    )
}

/** Celular do cliente (simulado): caixa do WhatsApp com as mensagens que o LíderSign enviou. */
export function PhoneSimulator({
    active,
    whatsappProvider,
}: {
    active: boolean
    whatsappProvider: 'simulator' | 'cloud_api'
}) {
    // A página aberta pelo link continua viva enquanto a pessoa olha a conversa, como num celular de verdade
    const [web, setWeb] = React.useState<WebTarget | null>(null)
    const [screen, setScreen] = React.useState<'chat' | 'web'>('chat')
    const [notice, setNotice] = React.useState<MessageDto | null>(null)
    const [connected, setConnected] = React.useState(false)
    const { data, reload } = useResource<MessageDto[]>(active ? demoApi.messagesUrl : null, {
        refreshMs: connected ? 10000 : 2500,
    })
    const messages = React.useMemo(() => (active ? (data ?? []) : []), [active, data])
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const seenRef = React.useRef<number | null>(null)

    // O evento ao vivo chega sem o código e sem o link (o escritório não pode vê-los):
    // ele só avisa que há mensagem nova, e o celular busca o conteúdo pela caixa da demo.
    const live = useLiveEvents((event: StreamEvent) => {
        if (event.type !== 'message.created') return
        void reload()
    }, active)

    React.useEffect(() => setConnected(live.connected), [live.connected])

    React.useEffect(() => {
        if (!active) {
            setWeb(null)
            setScreen('chat')
            setNotice(null)
            seenRef.current = null
        }
    }, [active])

    // Mensagem nova com a página aberta: aparece como notificação no topo da tela
    React.useEffect(() => {
        if (data === undefined) return
        const previous = seenRef.current
        seenRef.current = messages.length
        if (previous === null || messages.length <= previous || screen !== 'web') return
        setNotice(messages.at(-1) ?? null)
    }, [data, messages, screen])

    React.useEffect(() => {
        if (!notice) return
        const timer = window.setTimeout(() => setNotice(null), 9000)
        return () => window.clearTimeout(timer)
    }, [notice])

    React.useEffect(() => {
        const node = scrollRef.current
        if (node && screen === 'chat') node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
    }, [messages.length, screen])

    const open = (target: WebTarget) => {
        if (!web || web.path !== target.path) setWeb(target)
        setScreen('web')
        setNotice(null)
    }

    const lastTo = messages.at(-1)?.toMasked

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="text-center">
                <p className="text-sm font-medium text-ink">Celular do cliente (simulado)</p>
                <p className="mt-0.5 max-w-[320px] text-xs leading-relaxed text-muted">
                    {whatsappProvider === 'cloud_api'
                        ? 'Cloud API ligada: as mensagens também chegam no WhatsApp de verdade.'
                        : 'Simulador de WhatsApp: nenhuma conta necessária.'}
                </p>
            </div>

            <div className="relative w-[340px] rounded-[48px] border border-line-strong bg-ink p-[10px] shadow-[0_30px_60px_-30px_rgba(11,18,32,0.45)]">
                <div className="relative flex h-[700px] flex-col overflow-hidden rounded-[38px] bg-white">
                    <div className="flex h-9 shrink-0 items-center justify-between bg-white px-7 text-[12px] font-semibold text-ink">
                        <span className="tabular">{formatTime(new Date())}</span>
                        <span aria-hidden className="absolute left-1/2 top-2 h-[22px] w-[92px] -translate-x-1/2 rounded-full bg-ink" />
                        <span className="flex items-center gap-1 text-ink" aria-hidden>
                            <Signal className="size-3.5" />
                            <Wifi className="size-3.5" />
                            <BatteryFull className="size-4" />
                        </span>
                    </div>

                    {notice && screen === 'web' ? (
                        <button
                            type="button"
                            onClick={() => {
                                setNotice(null)
                                setScreen('chat')
                            }}
                            className="absolute inset-x-2 top-10 z-10 flex animate-enter gap-2.5 rounded-2xl border border-line bg-white/95 p-3 text-left shadow-[0_12px_30px_-12px_rgba(11,18,32,0.35)] backdrop-blur"
                            aria-label="Nova mensagem do LíderSign: abrir a conversa"
                        >
                            <LogoMark className="size-8 shrink-0" />
                            <span className="min-w-0">
                                <span className="flex items-baseline justify-between gap-2">
                                    <span className="text-[13px] font-semibold text-ink">LíderSign</span>
                                    <span className="text-[11px] text-subtle">agora</span>
                                </span>
                                <span className="mt-0.5 line-clamp-3 text-[13px] leading-snug text-ink/85">{notice.body}</span>
                            </span>
                        </button>
                    ) : null}

                    {web ? (
                        <div className={cn('flex min-h-0 flex-1 flex-col', screen !== 'web' && 'hidden')}>
                            <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-white px-3">
                                <button
                                    type="button"
                                    onClick={() => setScreen('chat')}
                                    className="inline-flex h-9 items-center gap-1 rounded-lg px-1.5 text-sm font-medium text-brand hover:bg-surface"
                                >
                                    <ArrowLeft className="size-4" aria-hidden /> Conversa
                                </button>
                                <span className="ml-auto inline-flex min-w-0 items-center gap-1 truncate rounded-full bg-surface px-2.5 py-1 text-[11px] text-muted">
                                    <Lock className="size-3 shrink-0" aria-hidden />
                                    <span className="truncate">{web.label}</span>
                                </span>
                            </div>
                            <iframe key={web.path} src={web.path} title={web.label} className="w-full flex-1 border-0 bg-white" />
                        </div>
                    ) : null}

                    <div className={cn('flex min-h-0 flex-1 flex-col', screen !== 'chat' && 'hidden')}>
                        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-white px-3">
                            <LogoMark className="size-9" />
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[15px] font-semibold leading-tight">LíderSign</p>
                                <p className="truncate text-[11px] text-muted">
                                    Conta comercial{lastTo ? ` · para ${lastTo}` : ''}
                                </p>
                            </div>
                            {web ? (
                                <button
                                    type="button"
                                    onClick={() => setScreen('web')}
                                    className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-brand hover:bg-surface"
                                >
                                    {web.label === 'Verificação' ? 'Verificação' : 'Assinatura'}
                                    <ArrowRight className="size-3.5" aria-hidden />
                                </button>
                            ) : null}
                        </div>

                        <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-chat px-3 py-4 scrollbar-thin">
                            {messages.length === 0 ? (
                                <div className="mx-auto mt-16 max-w-[240px] rounded-xl bg-white/80 px-4 py-3 text-center text-[13px] leading-relaxed text-muted">
                                    {active
                                        ? 'Nenhuma mensagem ainda. Envie o contrato no Atendimento.'
                                        : 'Ative o LíderSign e envie um contrato. As mensagens aparecem aqui.'}
                                </div>
                            ) : (
                                messages.map((message) => (
                                    <div key={message.id} className="flex animate-enter justify-start">
                                        <div
                                            className={cn(
                                                'relative max-w-[88%] rounded-xl rounded-tl-sm bg-white px-3 py-2 text-[14px] leading-snug text-ink shadow-[0_1px_0.5px_rgba(11,18,32,0.13)]',
                                                message.status === 'FAILED' && 'ring-1 ring-red-300',
                                            )}
                                        >
                                            <MessageText body={message.body} onOpen={open} />
                                            <span className="mt-1 flex items-center justify-end gap-1 text-[10px] text-subtle tabular">
                                                {formatTime(message.createdAt)}
                                                {message.status === 'FAILED' ? (
                                                    <span className="text-red-600">· não entregue</span>
                                                ) : (
                                                    <CheckCheck className="size-3 text-sky-500" aria-hidden />
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex shrink-0 items-center gap-2 bg-chat px-2 pb-4 pt-1.5" aria-hidden>
                            <div className="flex h-10 flex-1 items-center rounded-full bg-white px-4 text-[14px] text-subtle">
                                Mensagem
                            </div>
                            <span className="flex size-10 items-center justify-center rounded-full bg-brand text-white">
                                <Mic className="size-4" />
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
