import type { EnvelopeDetailDto, TemplateDto } from '@lidersign/shared'
import {
    CheckCheck,
    Download,
    ExternalLink,
    FileSignature,
    MessageCircle,
    Paperclip,
    RotateCcw,
    Search,
    SendHorizontal,
} from 'lucide-react'
import QRCode from 'qrcode'
import * as React from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { Button, Input, NativeSelect, cn, formatTime, errorMessage, useResource } from '@lidersign/ui'

import { envelopesApi, sampleValues, whatsappShareUrl } from '@/features/envelopes'
import { templatesApi } from '@/features/templates'

import { LEADS, loadSent, saveSent, type Lead, type SentContract } from '../data'

type ContractState = 'none' | 'sent' | 'viewed' | 'signed' | 'done'

function contractState(sent: SentContract | null, envelope: EnvelopeDetailDto | undefined): ContractState {
    if (!sent) return 'none'
    if (envelope?.status === 'COMPLETED') return 'done'
    if (envelope?.signedAt) return 'signed'
    if (envelope?.viewedAt) return 'viewed'
    return 'sent'
}

const STATE_BADGE: Record<Exclude<ContractState, 'none'>, { label: string; className: string }> = {
    sent: { label: 'Contrato enviado', className: 'bg-amber-50 text-amber-800' },
    viewed: { label: 'Contrato aberto', className: 'bg-amber-50 text-amber-800' },
    signed: { label: 'Assinado', className: 'bg-emerald-50 text-emerald-700' },
    done: { label: 'Assinado', className: 'bg-emerald-50 text-emerald-700' },
}

export function InboxPage({
    active,
    onOpenIntegrations,
}: {
    active: boolean
    onOpenIntegrations: () => void
}) {
    const [leadId, setLeadId] = React.useState(LEADS[0].id)
    const [sent, setSent] = React.useState<SentContract | null>(() => loadSent())
    const detail = useResource<EnvelopeDetailDto>(sent ? envelopesApi.detailUrl(sent.envelopeId) : null, {
        refreshMs: 3000,
    })
    const lead = LEADS.find((item) => item.id === leadId) ?? LEADS[0]
    const state = contractState(sent, detail.data)

    React.useEffect(() => {
        if (detail.error?.status === 404) {
            saveSent(null)
            setSent(null)
        }
    }, [detail.error])

    function onSent(value: SentContract) {
        saveSent(value)
        setSent(value)
    }

    function restart() {
        saveSent(null)
        setSent(null)
        toast('Conversa reiniciada')
    }

    return (
        <div className="grid h-[calc(100dvh-215px)] min-h-[560px] overflow-hidden rounded-xl border border-line bg-white lg:grid-cols-[272px_1fr_300px]">
            <ConversationList
                selected={lead.id}
                onSelect={setLeadId}
                badge={state === 'none' ? null : STATE_BADGE[state]}
            />
            <Chat
                lead={lead}
                sent={lead.interactive ? sent : null}
                envelope={lead.interactive ? detail.data : undefined}
                onRestart={restart}
            />
            <ContactPanel
                lead={lead}
                active={active}
                sent={lead.interactive ? sent : null}
                envelope={lead.interactive ? detail.data : undefined}
                state={lead.interactive ? state : 'none'}
                onSent={onSent}
                onOpenIntegrations={onOpenIntegrations}
            />
        </div>
    )
}

function ConversationList({
    selected,
    onSelect,
    badge,
}: {
    selected: string
    onSelect: (id: string) => void
    badge: { label: string; className: string } | null
}) {
    return (
        <aside className="hidden min-h-0 flex-col border-r border-line lg:flex">
            <div className="border-b border-line p-3">
                <div className="flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-sm text-subtle">
                    <Search className="size-4" aria-hidden /> Buscar conversa
                </div>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto">
                {LEADS.map((lead) => {
                    const last = lead.messages[lead.messages.length - 1]
                    return (
                        <li key={lead.id}>
                            <button
                                type="button"
                                onClick={() => onSelect(lead.id)}
                                aria-current={selected === lead.id ? 'true' : undefined}
                                className={cn(
                                    'flex w-full gap-3 border-b border-line px-3 py-3 text-left transition-colors',
                                    selected === lead.id ? 'bg-surface' : 'hover:bg-surface/60',
                                )}
                            >
                                <Avatar initials={lead.initials} />
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center justify-between gap-2">
                                        <span className="truncate text-sm font-medium">{lead.name}</span>
                                        <span className="shrink-0 text-[11px] text-subtle">{last.time}</span>
                                    </span>
                                    <span className="mt-0.5 block truncate text-xs text-muted">
                                        {last.text}
                                    </span>
                                    {lead.interactive && badge ? (
                                        <span
                                            className={cn(
                                                'mt-1.5 inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium',
                                                badge.className,
                                            )}
                                        >
                                            {badge.label}
                                        </span>
                                    ) : null}
                                </span>
                            </button>
                        </li>
                    )
                })}
            </ul>
        </aside>
    )
}

function Chat({
    lead,
    sent,
    envelope,
    onRestart,
}: {
    lead: Lead
    sent: SentContract | null
    envelope: EnvelopeDetailDto | undefined
    onRestart: () => void
}) {
    const linkMessage = sent
        ? `Perfeito, Maria! Aqui está o contrato para assinar pelo celular. É rápido: ${sent.url}`
        : ''
    const bottom = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        bottom.current?.scrollIntoView({ block: 'end' })
    }, [lead.id, sent, envelope?.status, envelope?.viewedAt])

    return (
        <section className="flex min-h-0 min-w-0 flex-col">
            <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line px-5">
                <div className="flex min-w-0 items-center gap-3">
                    <Avatar initials={lead.initials} />
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{lead.name}</p>
                        <p className="truncate text-xs text-muted">WhatsApp · {lead.topic}</p>
                    </div>
                </div>
                {sent ? (
                    <Button variant="ghost" size="sm" onClick={onRestart}>
                        <RotateCcw aria-hidden /> Recomeçar
                    </Button>
                ) : null}
            </header>

            <div
                className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#f7f5f2] px-4 py-5 sm:px-6"
                aria-live="polite"
            >
                {lead.messages.map((message, index) => (
                    <Bubble key={index} from={message.from} time={message.time}>
                        {message.text}
                    </Bubble>
                ))}
                {sent ? (
                    <>
                        <Bubble from="agent" time={formatTime(sent.at)}>
                            <span className="break-words">{linkMessage}</span>
                        </Bubble>
                        <SimulationNote url={sent.url} message={linkMessage} phone={sent.phone} />
                        {envelope?.viewedAt ? (
                            <SystemEvent at={envelope.viewedAt}>Maria abriu o contrato</SystemEvent>
                        ) : null}
                        {envelope?.signedAt ? (
                            <SystemEvent at={envelope.signedAt}>Maria assinou</SystemEvent>
                        ) : null}
                        {envelope?.status === 'COMPLETED' ? (
                            <Bubble from="agent" time={formatTime(envelope.completedAt!)}>
                                <a
                                    href={envelopesApi.fileUrl(envelope.id, 'signed')}
                                    download
                                    className="mb-2 flex items-center gap-3 rounded-lg bg-black/5 px-3 py-2.5"
                                >
                                    <FileSignature className="size-5 shrink-0 text-emerald-700" aria-hidden />
                                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                        Contrato assinado.pdf
                                    </span>
                                    <Download className="size-4 shrink-0 text-muted" aria-hidden />
                                </a>
                                Recebemos sua assinatura, Maria! Agora é com a gente: vamos dar entrada no
                                pedido do BPC.
                            </Bubble>
                        ) : null}
                    </>
                ) : null}
                <div ref={bottom} />
            </div>

            <footer className="flex shrink-0 items-center gap-2 border-t border-line px-4 py-3">
                <span className="flex size-9 items-center justify-center rounded-lg text-subtle">
                    <Paperclip className="size-4" aria-hidden />
                </span>
                <div className="flex h-10 flex-1 items-center rounded-lg border border-line px-3 text-sm text-subtle">
                    Mensagem
                </div>
                <span className="flex size-10 items-center justify-center rounded-lg bg-surface text-subtle">
                    <SendHorizontal className="size-4" aria-hidden />
                </span>
            </footer>
        </section>
    )
}

function ContactPanel({
    lead,
    active,
    sent,
    envelope,
    state,
    onSent,
    onOpenIntegrations,
}: {
    lead: Lead
    active: boolean
    sent: SentContract | null
    envelope: EnvelopeDetailDto | undefined
    state: ContractState
    onSent: (value: SentContract) => void
    onOpenIntegrations: () => void
}) {
    return (
        <aside className="min-h-0 overflow-y-auto border-t border-line lg:border-l lg:border-t-0">
            <section className="border-b border-line p-5">
                <h2 className="text-sm font-semibold">Dados do contato</h2>
                <dl className="mt-3 space-y-2.5 text-sm">
                    <Row label="Nome" value={lead.name} />
                    <Row label="CPF" value={lead.cpf} mono />
                    <Row label="Cidade" value={lead.city} />
                    <Row
                        label="Etapa do funil"
                        value={state === 'done' || state === 'signed' ? 'Fechado' : lead.stage}
                    />
                </dl>
            </section>

            <section className="p-5">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold">Contrato</h2>
                    <span className="text-[11px] font-medium text-subtle">LíderSign</span>
                </div>

                {!lead.interactive ? (
                    <p className="mt-2 text-sm text-muted">
                        Conversa de exemplo. O envio de contrato está na conversa da Maria.
                    </p>
                ) : !active ? (
                    <div className="mt-3 space-y-3">
                        <p className="text-sm text-muted">
                            Ative o LíderSign em Integrações para enviar contratos daqui.
                        </p>
                        <Button size="sm" variant="secondary" className="w-full" onClick={onOpenIntegrations}>
                            Ir para Integrações
                        </Button>
                    </div>
                ) : sent ? (
                    <ContractStatus envelope={envelope} state={state} />
                ) : (
                    <SendContract lead={lead} onSent={onSent} />
                )}
            </section>
        </aside>
    )
}

function SendContract({ lead, onSent }: { lead: Lead; onSent: (value: SentContract) => void }) {
    const templates = useResource<TemplateDto[]>(templatesApi.listUrl)
    const [templateId, setTemplateId] = React.useState('')
    const [phone, setPhone] = React.useState('')
    const [sending, setSending] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    React.useEffect(() => {
        if (templateId || !templates.data?.length) return
        const preferred = templates.data.find((item) => item.kind === 'CONTRATO') ?? templates.data[0]
        if (preferred) setTemplateId(preferred.id)
    }, [templates.data, templateId])

    async function send(event: React.FormEvent) {
        event.preventDefault()
        const template = templates.data?.find((item) => item.id === templateId)
        if (!template) return
        if (phone.replace(/\D/g, '').length < 10) {
            setError('Informe o WhatsApp com DDD.')
            return
        }
        setError(null)
        setSending(true)
        try {
            const sample = sampleValues()
            const variables = Object.fromEntries(
                template.variables.map((variable) => [
                    variable.key,
                    sample[variable.key] ?? variable.example ?? '',
                ]),
            )
            const envelope = await envelopesApi.create({
                templateId: template.id,
                variables,
                signer: { name: lead.name, cpf: lead.cpf, phone },
                externalRef: 'lead-maria-aparecida-bpc',
                send: true,
            })
            onSent({
                envelopeId: envelope.id,
                url: envelope.signingUrl ?? '',
                phone,
                at: new Date().toISOString(),
            })
        } catch (err) {
            setError(errorMessage(err))
        } finally {
            setSending(false)
        }
    }

    return (
        <form onSubmit={send} className="mt-3 space-y-3">
            <div className="space-y-1.5">
                <label htmlFor="sim-template" className="text-xs font-medium text-muted">
                    Modelo
                </label>
                <NativeSelect
                    id="sim-template"
                    value={templateId}
                    onChange={(event) => setTemplateId(event.target.value)}
                >
                    {(templates.data ?? []).map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.name}
                        </option>
                    ))}
                </NativeSelect>
            </div>
            <div className="space-y-1.5">
                <label htmlFor="sim-phone" className="text-xs font-medium text-muted">
                    WhatsApp da Maria
                </label>
                <Input
                    id="sim-phone"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    inputMode="tel"
                    placeholder="(47) 99999-0000"
                    className="tabular"
                />
                <p className="text-xs text-subtle">Para testar, use o seu número.</p>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <Button type="submit" className="w-full" loading={sending} disabled={!templateId}>
                <FileSignature aria-hidden /> Enviar para assinatura
            </Button>
            <p className="text-xs leading-relaxed text-muted">
                Os campos do contrato vêm dos dados do contato. O link sai nesta conversa.
            </p>
        </form>
    )
}

function ContractStatus({
    envelope,
    state,
}: {
    envelope: EnvelopeDetailDto | undefined
    state: ContractState
}) {
    const steps = [
        { label: 'Enviado', at: envelope?.sentAt ?? envelope?.createdAt ?? null },
        { label: 'Aberto pela Maria', at: envelope?.viewedAt ?? null },
        { label: 'Assinado', at: envelope?.signedAt ?? null },
        { label: 'PDF pronto', at: envelope?.completedAt ?? null },
    ]
    return (
        <div className="mt-3 space-y-4">
            <p className="text-sm font-medium">{envelope?.title ?? 'Contrato'}</p>
            <ol className="space-y-2.5">
                {steps.map((step) => (
                    <li key={step.label} className="flex items-center gap-2.5 text-sm">
                        <span
                            className={cn(
                                'flex size-5 items-center justify-center rounded-full',
                                step.at ? 'bg-emerald-100 text-emerald-700' : 'border border-line-strong',
                            )}
                        >
                            {step.at ? <CheckCheck className="size-3" aria-hidden /> : null}
                        </span>
                        <span className={step.at ? 'text-ink' : 'text-subtle'}>{step.label}</span>
                        {step.at ? (
                            <span className="ml-auto text-xs text-subtle tabular">{formatTime(step.at)}</span>
                        ) : null}
                    </li>
                ))}
            </ol>
            <div className="space-y-2">
                {state === 'done' && envelope ? (
                    <Button asChild className="w-full">
                        <a href={envelopesApi.fileUrl(envelope.id, 'signed')} download>
                            <Download aria-hidden /> Baixar PDF assinado
                        </a>
                    </Button>
                ) : null}
                {envelope ? (
                    <Button asChild variant="secondary" className="w-full">
                        <Link to={`/liderhub?aba=contratos`}>Ver em Contratos</Link>
                    </Button>
                ) : null}
                {envelope ? (
                    <a
                        href={`/painel/envelopes/${envelope.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-1 text-xs text-muted hover:text-ink"
                    >
                        Trilha de auditoria no LíderSign <ExternalLink className="size-3" aria-hidden />
                    </a>
                ) : null}
            </div>
        </div>
    )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <dt className="shrink-0 text-muted">{label}</dt>
            <dd className={cn('truncate text-right', mono && 'font-mono text-[13px] tabular')}>{value}</dd>
        </div>
    )
}

function Avatar({ initials }: { initials: string }) {
    return (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-800">
            {initials}
        </span>
    )
}

function Bubble({
    from,
    time,
    children,
}: {
    from: 'lead' | 'agent'
    time: string
    children: React.ReactNode
}) {
    const agent = from === 'agent'
    return (
        <div className={cn('flex', agent ? 'justify-end' : 'justify-start')}>
            <div
                className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed shadow-[0_1px_0_rgba(0,0,0,0.05)] sm:max-w-[72%]',
                    agent ? 'rounded-br-md bg-[#dcf8d4]' : 'rounded-bl-md bg-white',
                )}
            >
                {agent ? (
                    <p className="mb-0.5 text-[11px] font-semibold text-emerald-800">Agente de IA</p>
                ) : null}
                <div>{children}</div>
                <p className="mt-1 text-right text-[11px] text-black/45 tabular">{time}</p>
            </div>
        </div>
    )
}

function SystemEvent({ at, children }: { at: string; children: React.ReactNode }) {
    return (
        <div className="flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs text-ink/70 shadow-[0_1px_0_rgba(0,0,0,0.05)]">
                <CheckCheck className="size-3.5 text-brand" aria-hidden />
                {children} · <span className="tabular">{formatTime(at)}</span>
            </span>
        </div>
    )
}

function SimulationNote({ url, message, phone }: { url: string; message: string; phone: string }) {
    const [qr, setQr] = React.useState<string | null>(null)
    React.useEffect(() => {
        let cancelled = false
        QRCode.toDataURL(url, { margin: 1, width: 240 })
            .then((data) => {
                if (!cancelled) setQr(data)
            })
            .catch(() => setQr(null))
        return () => {
            cancelled = true
        }
    }, [url])

    return (
        <div className="mx-auto flex max-w-md items-center gap-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 p-3.5">
            {qr ? (
                <img
                    src={qr}
                    alt="QR code do link de assinatura"
                    className="size-20 shrink-0 rounded-md bg-white p-1"
                />
            ) : null}
            <div className="min-w-0 text-[13px] leading-relaxed text-amber-950/85">
                <p>Na LíderHub de verdade, esta mensagem sai pelo WhatsApp oficial. Aqui, mande para você:</p>
                <a
                    href={whatsappShareUrl(message, phone)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1.5 font-semibold text-amber-950 underline underline-offset-2"
                >
                    <MessageCircle className="size-4" aria-hidden /> Abrir no meu WhatsApp
                </a>
                <span className="text-amber-950/70"> ou aponte a câmera para o QR.</span>
            </div>
        </div>
    )
}
