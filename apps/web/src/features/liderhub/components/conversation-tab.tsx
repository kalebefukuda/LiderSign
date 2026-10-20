import type { EnvelopeDetailDto, TemplateDto } from '@lidersign/shared'
import { CheckCheck, Download, FileSignature, MessageCircle, RotateCcw, Send } from 'lucide-react'
import QRCode from 'qrcode'
import * as React from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Field, Input, NativeSelect } from '@/components/ui/primitives'
import { envelopesApi, SAMPLE_SIGNER, sampleValues, whatsappShareUrl } from '@/features/envelopes'
import { templatesApi } from '@/features/templates'
import { cn } from '@/lib/cn'
import { formatTime } from '@/lib/format'
import { errorMessage } from '@/lib/http'
import { useResource } from '@/lib/use-resource'

type Sent = { envelopeId: string; url: string; phone: string; at: string }

const STORE_KEY = 'lidersign:liderhub-sim:sent'

function loadSent(): Sent | null {
    try {
        const raw = sessionStorage.getItem(STORE_KEY)
        return raw ? (JSON.parse(raw) as Sent) : null
    } catch {
        return null
    }
}

function saveSent(value: Sent | null) {
    try {
        if (value) sessionStorage.setItem(STORE_KEY, JSON.stringify(value))
        else sessionStorage.removeItem(STORE_KEY)
    } catch {
        // sem sessionStorage: a conversa só não sobrevive ao recarregar
    }
}

const LEAD = { ...SAMPLE_SIGNER, city: 'Joinville/SC' }

/** A conversa com a lead, do jeito que a LíderHub mostraria: o contrato sai daqui e o status volta para cá. */
export function ConversationTab({
    active,
    onOpenIntegrations,
}: {
    active: boolean
    onOpenIntegrations: () => void
}) {
    const [sent, setSent] = React.useState<Sent | null>(() => loadSent())
    const templates = useResource<TemplateDto[]>(active ? templatesApi.listUrl : null)
    const detail = useResource<EnvelopeDetailDto>(sent ? envelopesApi.detailUrl(sent.envelopeId) : null, {
        refreshMs: 3000,
    })
    const [templateId, setTemplateId] = React.useState('')
    const [phone, setPhone] = React.useState('')
    const [sending, setSending] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    React.useEffect(() => {
        if (templateId || !templates.data?.length) return
        const preferred = templates.data.find((item) => item.kind === 'CONTRATO') ?? templates.data[0]
        if (preferred) setTemplateId(preferred.id)
    }, [templates.data, templateId])

    // Envelope apagado (ex.: demonstração reiniciada): a conversa volta ao começo
    React.useEffect(() => {
        if (detail.error?.status === 404) {
            saveSent(null)
            setSent(null)
        }
    }, [detail.error])

    async function send(event: React.FormEvent) {
        event.preventDefault()
        const template = templates.data?.find((item) => item.id === templateId)
        if (!template) return
        if (phone.replace(/\D/g, '').length < 10) {
            setError('Informe o WhatsApp da Maria com DDD.')
            return
        }
        setError(null)
        setSending(true)
        try {
            // A LíderHub preenche os campos com o que já sabe da lead
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
                signer: { name: LEAD.name, cpf: LEAD.cpf, phone },
                externalRef: LEAD.externalRef,
                send: true,
            })
            const value = {
                envelopeId: envelope.id,
                url: envelope.signingUrl ?? '',
                phone,
                at: new Date().toISOString(),
            }
            saveSent(value)
            setSent(value)
        } catch (err) {
            setError(errorMessage(err))
        } finally {
            setSending(false)
        }
    }

    function restart() {
        saveSent(null)
        setSent(null)
        toast('Conversa reiniciada')
    }

    const envelope = detail.data
    const linkMessage = sent
        ? `Perfeito, Maria! Aqui está o contrato para assinar pelo celular. É rápido: ${sent.url}`
        : ''

    return (
        <div className="grid min-h-[640px] overflow-hidden rounded-2xl border border-line bg-white lg:grid-cols-[1fr_300px]">
            <section className="flex min-w-0 flex-col">
                <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                    <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">
                            MA
                        </span>
                        <div>
                            <p className="font-semibold leading-tight">{LEAD.name}</p>
                            <p className="text-xs text-muted">WhatsApp · BPC/LOAS</p>
                        </div>
                    </div>
                    {sent ? (
                        <Button variant="ghost" size="sm" onClick={restart}>
                            <RotateCcw aria-hidden /> Recomeçar
                        </Button>
                    ) : null}
                </header>

                <div className="flex-1 space-y-3 bg-[#f4f1ec] px-4 py-5 sm:px-6" aria-live="polite">
                    <Bubble from="lead" time="10:02">
                        Oi, boa tarde! Vi o anúncio sobre o BPC. Tenho 66 anos e nunca consegui o benefício.
                    </Bubble>
                    <Bubble from="agent" time="10:03">
                        Olá, Maria! Pelo que você contou, dá para pedir o BPC/LOAS. O escritório cuida de tudo
                        e só cobra se der certo: 30% dos valores atrasados.
                    </Bubble>
                    <Bubble from="lead" time="10:04">
                        Pode mandar o contrato então.
                    </Bubble>

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
                                <>
                                    <Bubble from="agent" time={formatTime(envelope.completedAt!)}>
                                        <a
                                            href={envelopesApi.fileUrl(envelope.id, 'signed')}
                                            download
                                            className="mb-2 flex items-center gap-3 rounded-lg bg-black/5 px-3 py-2.5"
                                        >
                                            <FileSignature
                                                className="size-5 shrink-0 text-emerald-700"
                                                aria-hidden
                                            />
                                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                                                Contrato assinado.pdf
                                            </span>
                                            <Download className="size-4 shrink-0 text-muted" aria-hidden />
                                        </a>
                                        Recebemos sua assinatura, Maria! Agora é com a gente: vamos dar
                                        entrada no pedido do BPC.
                                    </Bubble>
                                </>
                            ) : null}
                        </>
                    ) : null}
                </div>

                <footer className="border-t border-line bg-white px-4 py-4 sm:px-5">
                    {!active ? (
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm text-muted">
                                Para enviar contratos daqui, ative o LíderSign em Integrações.
                            </p>
                            <Button size="sm" onClick={onOpenIntegrations}>
                                Ir para Integrações
                            </Button>
                        </div>
                    ) : sent ? (
                        <p className="flex items-center gap-2 text-sm text-muted">
                            <CheckCheck className="size-4 text-emerald-600" aria-hidden />
                            Contrato enviado pelo LíderSign. O status aparece na conversa sozinho.
                        </p>
                    ) : (
                        <form onSubmit={send} className="space-y-3">
                            <p className="text-sm font-semibold">Enviar contrato para assinatura</p>
                            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                                <Field label="Modelo" htmlFor="sim-template">
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
                                </Field>
                                <Field
                                    label="WhatsApp da Maria"
                                    htmlFor="sim-phone"
                                    hint="Para testar, use o seu número"
                                >
                                    <Input
                                        id="sim-phone"
                                        value={phone}
                                        onChange={(event) => setPhone(event.target.value)}
                                        inputMode="tel"
                                        placeholder="(47) 99999-0000"
                                        className="tabular"
                                    />
                                </Field>
                                <Button
                                    type="submit"
                                    loading={sending}
                                    disabled={!templateId}
                                    className="sm:mb-[22px]"
                                >
                                    <Send aria-hidden /> Enviar contrato
                                </Button>
                            </div>
                            {error ? (
                                <p className="text-sm text-red-600">{error}</p>
                            ) : (
                                <p className="text-xs text-muted">
                                    Para testar, use o seu número: o link chega no seu WhatsApp.
                                </p>
                            )}
                        </form>
                    )}
                </footer>
            </section>

            <aside className="border-t border-line bg-surface/40 p-5 lg:border-l lg:border-t-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle">
                    Dados da lead
                </p>
                <dl className="mt-3 space-y-3 text-sm">
                    <Item label="Nome" value={LEAD.name} />
                    <Item label="CPF" value={LEAD.cpf} mono />
                    <Item label="Cidade" value={LEAD.city} />
                    <Item
                        label="Contrato"
                        value={
                            !sent
                                ? 'Não enviado'
                                : envelope?.status === 'COMPLETED'
                                  ? 'Assinado'
                                  : envelope?.signedAt
                                    ? 'Assinado, finalizando o PDF'
                                    : envelope?.viewedAt
                                      ? 'Aberto pela Maria'
                                      : 'Enviado'
                        }
                    />
                </dl>
                <p className="mt-6 text-xs leading-relaxed text-muted">
                    Ao abrir o link, a Maria confirma o CPF acima, confere o contrato e assina.
                </p>
            </aside>
        </div>
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
                    'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed shadow-[0_1px_0_rgba(0,0,0,0.06)] sm:max-w-[70%]',
                    agent ? 'rounded-br-md bg-[#d9fdd3]' : 'rounded-bl-md bg-white',
                )}
            >
                {agent ? (
                    <p className="mb-0.5 text-[11px] font-semibold text-emerald-800">Agente da LíderHub</p>
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
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs text-ink/70">
                <CheckCheck className="size-3.5 text-brand" aria-hidden />
                {children} · <span className="tabular">{formatTime(at)}</span>
            </span>
        </div>
    )
}

/** Sem WhatsApp oficial nesta simulação: a pessoa testando manda o link para o próprio WhatsApp. */
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

function Item({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div>
            <dt className="text-xs text-muted">{label}</dt>
            <dd className={cn('mt-0.5 font-medium', mono && 'font-mono tabular')}>{value}</dd>
        </div>
    )
}
