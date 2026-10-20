import type { MessageDto, StreamEvent } from '@lidersign/shared'
import { ArrowLeft, BatteryFull, CheckCheck, Lock, Mic, Signal, Wifi } from 'lucide-react'
import * as React from 'react'

import { LogoMark } from '@/features/brand'
import { useLiveEvents } from '@/features/realtime'
import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/format'
import { useResource } from '@/lib/use-resource'

import { demoApi } from '../api'

type View = { kind: 'chat' } | { kind: 'web'; path: string; label: string }

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
    const [view, setView] = React.useState<View>({ kind: 'chat' })
    const [connected, setConnected] = React.useState(false)
    const { data, setData } = useResource<MessageDto[]>(active ? demoApi.messagesUrl : null, {
        refreshMs: connected ? 10000 : 2500,
    })
    const messages = active ? (data ?? []) : []
    const scrollRef = React.useRef<HTMLDivElement>(null)

    const live = useLiveEvents((event: StreamEvent) => {
        if (event.type !== 'message.created') return
        setData((current) => {
            const list = current ?? []
            return list.some((item) => item.id === event.message.id) ? list : [...list, event.message]
        })
    }, active)

    React.useEffect(() => setConnected(live.connected), [live.connected])

    React.useEffect(() => {
        if (!active) setView({ kind: 'chat' })
    }, [active])

    React.useEffect(() => {
        const node = scrollRef.current
        if (node && view.kind === 'chat') node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
    }, [messages.length, view.kind])

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

                    {view.kind === 'web' ? (
                        <>
                            <div className="flex h-12 shrink-0 items-center gap-2 border-b border-line bg-white px-3">
                                <button
                                    type="button"
                                    onClick={() => setView({ kind: 'chat' })}
                                    className="inline-flex h-9 items-center gap-1 rounded-lg px-1.5 text-sm font-medium text-brand hover:bg-surface"
                                >
                                    <ArrowLeft className="size-4" aria-hidden /> Conversa
                                </button>
                                <span className="ml-auto inline-flex min-w-0 items-center gap-1 truncate rounded-full bg-surface px-2.5 py-1 text-[11px] text-muted">
                                    <Lock className="size-3 shrink-0" aria-hidden />
                                    <span className="truncate">{view.label}</span>
                                </span>
                            </div>
                            <iframe
                                key={view.path}
                                src={view.path}
                                title={view.label}
                                className="w-full flex-1 border-0 bg-white"
                            />
                        </>
                    ) : (
                        <>
                            <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-white px-3">
                                <LogoMark className="size-9" />
                                <div className="min-w-0">
                                    <p className="truncate text-[15px] font-semibold leading-tight">LíderSign</p>
                                    <p className="truncate text-[11px] text-muted">
                                        Conta comercial{lastTo ? ` · para ${lastTo}` : ''}
                                    </p>
                                </div>
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
                                                <MessageText
                                                    body={message.body}
                                                    onOpen={(target) => setView({ kind: 'web', ...target })}
                                                />
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
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
