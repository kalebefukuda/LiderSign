import {
    ASSURANCE_LEVEL_LABEL,
    type EnvelopeDetailDto,
    type MessageKind,
    type StreamEvent,
} from '@lidersign/shared'
import { ArrowLeft, CheckCircle2, ChevronDown, Download, ExternalLink, Loader2, RefreshCw, Send, XCircle } from 'lucide-react'
import { Link } from 'react-router'
import * as React from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Card, Kicker, Skeleton } from '@/components/ui/primitives'
import { CopyButton, EmptyState, ErrorNotice } from '@/components/ui/states'
import { useLiveEvents } from '@/features/realtime'
import { cn } from '@/lib/cn'
import { errorMessage } from '@/lib/http'
import { firstName, formatDateTime, formatDateTimeLong } from '@/lib/format'
import { useResource } from '@/lib/use-resource'

import { envelopesApi } from '../api'
import { rememberLink } from '../link-store'
import { AuditTrail } from './audit-trail'
import { SigningLinkCard } from './signing-link-card'
import { StatusPill } from './status-pill'

const MESSAGE_KIND_LABEL: Record<MessageKind, string> = {
    SIGNING_LINK: 'Link de assinatura',
    OTP: 'Código de confirmação',
    SIGNED_COPY: 'Cópia assinada',
    REMINDER: 'Lembrete',
    TEST: 'Mensagem de teste',
}

const FINAL_STATUSES = ['COMPLETED', 'CANCELED', 'EXPIRED']

/** O advogado nunca vê o código que o cliente recebeu. */
function hideOtp(body: string) {
    return body.replace(/\b\d{6}\b/g, '••••••')
}

export function EnvelopeDetail({ id }: { id: string }) {
    const url = envelopesApi.detailUrl(id)
    const [final, setFinal] = React.useState(false)
    const { data, error, loading, reload } = useResource<EnvelopeDetailDto>(url, { refreshMs: final ? 0 : 4000 })
    const [busy, setBusy] = React.useState<'resend' | 'cancel' | null>(null)
    const [confirmCancel, setConfirmCancel] = React.useState(false)
    const [linkVersion, setLinkVersion] = React.useState(0)

    React.useEffect(() => {
        if (data) setFinal(FINAL_STATUSES.includes(data.status) && data.timestamp.status !== 'PENDING')
    }, [data])

    useLiveEvents((event: StreamEvent) => {
        if (event.type === 'envelope.updated' && event.envelope.id === id) void reload()
        if (event.type === 'webhook.delivered' && event.envelopeId === id) void reload()
    })

    async function act(action: 'resend' | 'cancel') {
        setBusy(action)
        try {
            if (action === 'resend') {
                const envelope = await envelopesApi.resend(id)
                rememberLink(id, envelope.signingUrl)
                setLinkVersion((value) => value + 1)
                toast.success('Novo link pronto. O anterior deixou de valer.')
            } else {
                await envelopesApi.cancel(id)
                toast.success('Envio cancelado')
            }
            await reload()
        } catch (err) {
            toast.error(errorMessage(err))
        } finally {
            setBusy(null)
            setConfirmCancel(false)
        }
    }

    if (loading && !data) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
        )
    }

    if (error && !data) {
        return error.status === 404 ? (
            <EmptyState
                title="Envio não encontrado"
                description="Ele pode ter sido apagado ao reiniciar a demonstração."
                action={
                    <Button asChild variant="secondary">
                        <Link to="/painel/envelopes">Voltar para os envios</Link>
                    </Button>
                }
            />
        ) : (
            <ErrorNotice
                message={error.message}
                action={
                    <Button variant="secondary" size="sm" onClick={() => void reload()}>
                        <RefreshCw aria-hidden /> Tentar de novo
                    </Button>
                }
            />
        )
    }

    if (!data) return null
    const canAct = data.status === 'SENT' || data.status === 'VIEWED'
    const signerFirst = firstName(data.signer.name)

    return (
        <div className="space-y-10 animate-enter">
            <div>
                <Link
                    to="/painel/envelopes"
                    className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
                >
                    <ArrowLeft className="size-4" /> Envios
                </Link>
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-[-0.03em] sm:text-[28px]">{data.title}</h1>
                            <StatusPill status={data.status} />
                        </div>
                        <p className="mt-1.5 text-[15px] text-muted">
                            Para <span className="text-ink">{data.signer.name}</span> · enviado em{' '}
                            <span className="tabular">{formatDateTime(data.sentAt ?? data.createdAt)}</span>
                        </p>
                    </div>
                    {canAct ? (
                        <div className="flex gap-2">
                            <Button variant="secondary" size="sm" loading={busy === 'resend'} onClick={() => act('resend')}>
                                <Send aria-hidden /> Gerar novo link
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(true)}>
                                <XCircle aria-hidden /> Cancelar envio
                            </Button>
                        </div>
                    ) : null}
                </div>
            </div>

            <Progress envelope={data} />

            {canAct ? (
                <SigningLinkCard
                    key={linkVersion}
                    envelopeId={id}
                    signerFirstName={signerFirst}
                    documentTitle={data.title}
                    phoneMasked={data.signer.phoneMasked}
                />
            ) : null}

            {data.status === 'SIGNED' ? (
                <Notice icon={<Loader2 className="size-5 animate-spin text-brand" aria-hidden />}>
                    {signerFirst} assinou. Estamos finalizando o PDF com o selo e o carimbo do tempo, leva poucos segundos.
                </Notice>
            ) : null}

            {data.status === 'COMPLETED' ? (
                <section className="flex flex-col gap-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-600" aria-hidden />
                        <div>
                            <h2 className="text-xl font-bold tracking-[-0.02em]">{signerFirst} assinou</h2>
                            <p className="mt-1 text-[15px] text-ink/80">
                                Em {formatDateTimeLong(data.signedAt ?? data.completedAt!)}. O PDF assinado já está pronto
                                {data.messages.some((m) => m.kind === 'SIGNED_COPY' && m.provider !== 'simulator')
                                    ? ` e uma cópia foi para o WhatsApp de ${signerFirst}.`
                                    : '.'}
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                        <Button asChild>
                            <a href={envelopesApi.fileUrl(id, 'signed')} download>
                                <Download aria-hidden /> Baixar PDF assinado
                            </a>
                        </Button>
                        <Button asChild variant="secondary">
                            <Link to={`/v/${encodeURIComponent(data.verificationCode)}`}>
                                Ver autenticidade <ExternalLink aria-hidden />
                            </Link>
                        </Button>
                    </div>
                </section>
            ) : null}

            {data.status === 'CANCELED' || data.status === 'EXPIRED' ? (
                <Notice icon={<XCircle className="size-5 text-muted" aria-hidden />}>
                    {data.status === 'CANCELED'
                        ? 'Este envio foi cancelado. O link deixou de funcionar.'
                        : `O prazo para assinar acabou em ${formatDateTime(data.expiresAt)}. Envie o documento de novo.`}
                </Notice>
            ) : null}

            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                <section aria-labelledby="historico">
                    <h2 id="historico" className="mb-4 text-lg font-semibold tracking-[-0.02em]">
                        Histórico
                    </h2>
                    <Card className="p-6">
                        {data.events.length ? (
                            <AuditTrail events={data.events} />
                        ) : (
                            <p className="text-sm text-muted">Nada registrado ainda.</p>
                        )}
                    </Card>
                </section>

                <aside className="space-y-6 lg:pt-11">
                    <Card className="p-6">
                        <Kicker>Documento</Kicker>
                        <div className="mt-4 flex flex-col gap-2">
                            {data.status === 'COMPLETED' ? (
                                <DownloadLink href={envelopesApi.fileUrl(id, 'signed')} label="PDF assinado" primary />
                            ) : null}
                            <DownloadLink href={envelopesApi.fileUrl(id, 'original')} label="PDF enviado (sem assinatura)" />
                        </div>
                    </Card>

                    <Card className="space-y-4 p-6">
                        <Kicker>Quem assina</Kicker>
                        <div>
                            <p className="text-[15px] font-medium">{data.signer.name}</p>
                            <p className="mt-1 font-mono text-[13px] text-muted tabular">
                                CPF {data.signer.cpfMasked} · {data.signer.phoneMasked}
                            </p>
                        </div>
                        <p className="text-sm text-muted">
                            Nível {ASSURANCE_LEVEL_LABEL[data.assuranceLevel]}:{' '}
                            {data.assuranceLevel === 'REFORCADO'
                                ? 'confirma o CPF, o código no WhatsApp e tira uma selfie.'
                                : 'confirma o CPF e assina.'}
                        </p>
                    </Card>

                    <Card className="p-6">
                        <Kicker>Código de verificação</Kicker>
                        <div className="mt-2 flex items-center gap-1">
                            <span className="font-mono text-[17px] tracking-wide">{data.verificationCode}</span>
                            <CopyButton value={data.verificationCode} />
                        </div>
                        <p className="mt-2 text-sm leading-relaxed text-muted">
                            Vai impresso no PDF. Qualquer pessoa confere a autenticidade em{' '}
                            <Link to="/v" className="text-brand hover:underline">
                                Verificar documento
                            </Link>
                            .
                        </p>
                    </Card>
                </aside>
            </div>

            <TechnicalDetails data={data} id={id} />

            <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
                <DialogContent className="p-6">
                    <DialogTitle>Cancelar este envio?</DialogTitle>
                    <DialogDescription className="mt-2">
                        O link de assinatura deixa de funcionar na hora. Para assinar depois, será preciso enviar de novo.
                    </DialogDescription>
                    <div className="mt-6 flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
                            Manter
                        </Button>
                        <Button variant="dark" loading={busy === 'cancel'} onClick={() => act('cancel')}>
                            Cancelar envio
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

/** Andamento em 4 passos, do jeito que o escritório pensa. */
function Progress({ envelope }: { envelope: EnvelopeDetailDto }) {
    const stopped = envelope.status === 'CANCELED' || envelope.status === 'EXPIRED'
    const steps = [
        { label: 'Enviado', at: envelope.sentAt ?? envelope.createdAt },
        { label: 'Aberto pelo cliente', at: envelope.viewedAt },
        { label: 'Assinado', at: envelope.signedAt },
        { label: 'PDF pronto', at: envelope.completedAt },
    ]
    const current = steps.findIndex((step) => !step.at)
    return (
        <ol aria-label="Andamento" className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
            {steps.map((step, index) => {
                const done = Boolean(step.at)
                const active = !stopped && index === current
                return (
                    <li key={step.label} className="min-w-0">
                        <div
                            className={cn(
                                'h-1 rounded-full',
                                done ? 'bg-brand' : active ? 'bg-brand/30' : 'bg-line',
                            )}
                        />
                        <p className={cn('mt-2.5 text-sm font-medium', done ? 'text-ink' : active ? 'text-ink/70' : 'text-subtle')}>
                            {step.label}
                        </p>
                        <p className="mt-0.5 text-xs text-subtle tabular">
                            {step.at ? formatDateTime(step.at) : active ? 'aguardando' : ''}
                        </p>
                    </li>
                )
            })}
        </ol>
    )
}

function Notice({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface/60 p-5 text-[15px] leading-relaxed text-ink/85">
            <span className="mt-0.5 shrink-0">{icon}</span>
            <p>{children}</p>
        </div>
    )
}

/** Para auditoria e para a TI: hashes, carimbo do tempo, mensagens e avisos para a LíderHub. */
function TechnicalDetails({ data, id }: { data: EnvelopeDetailDto; id: string }) {
    return (
        <details className="group rounded-2xl border border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-sm font-medium text-muted transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
                Detalhes técnicos e trilha de auditoria
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="grid gap-8 border-t border-line px-6 py-6 lg:grid-cols-2">
                <div className="space-y-5">
                    <HashRow label="SHA-256 do PDF enviado" value={data.originalSha256} />
                    {data.signedSha256 ? <HashRow label="SHA-256 do PDF assinado" value={data.signedSha256} /> : null}
                    <div>
                        <p className="text-xs text-subtle">Carimbo do tempo (RFC 3161)</p>
                        <p className="mt-1 text-sm">
                            <TimestampLabel status={data.timestamp.status} />
                            {data.timestamp.genTime ? (
                                <span className="text-muted tabular"> · {formatDateTimeLong(data.timestamp.genTime)}</span>
                            ) : null}
                        </p>
                        {data.timestamp.status === 'OK' ? (
                            <a
                                href={envelopesApi.fileUrl(id, 'timestamp')}
                                download
                                className="mt-1 inline-flex items-center gap-1 text-sm text-brand hover:underline"
                            >
                                Baixar carimbo (.tsr) <Download className="size-3.5" aria-hidden />
                            </a>
                        ) : null}
                    </div>
                    {data.externalRef ? (
                        <div>
                            <p className="text-xs text-subtle">Referência na LíderHub</p>
                            <p className="mt-1 font-mono text-sm">{data.externalRef}</p>
                        </div>
                    ) : null}
                    <div>
                        <p className="text-xs text-subtle">Mensagens</p>
                        {data.messages.length ? (
                            <ul className="mt-2 space-y-2">
                                {data.messages.map((message) => (
                                    <li key={message.id} className="text-sm">
                                        <span className="font-medium">{MESSAGE_KIND_LABEL[message.kind]}</span>{' '}
                                        <span className="text-subtle tabular">{formatDateTime(message.createdAt)}</span>
                                        <p className="line-clamp-1 text-muted">{hideOtp(message.body)}</p>
                                        <p className="text-xs text-subtle">
                                            {message.provider === 'simulator'
                                                ? 'Modo demonstração: registrada, não enviada'
                                                : message.status === 'FAILED'
                                                  ? `WhatsApp: falhou${message.error ? `, ${message.error}` : ''}`
                                                  : `WhatsApp · ${message.toMasked}`}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mt-1 text-sm text-muted">Nenhuma.</p>
                        )}
                    </div>
                    <div>
                        <p className="text-xs text-subtle">Avisos para a LíderHub (webhooks)</p>
                        {data.webhookDeliveries.length ? (
                            <ul className="mt-2 space-y-1.5">
                                {data.webhookDeliveries.map((delivery) => (
                                    <li key={delivery.id} className="flex items-center justify-between gap-3 text-sm">
                                        <span className="font-mono text-[13px]">{delivery.event}</span>
                                        <Badge tone={delivery.ok ? 'success' : 'danger'}>
                                            {delivery.statusCode ?? 'sem resposta'}
                                            {delivery.attempts > 1 ? ` · ${delivery.attempts} tentativas` : ''}
                                        </Badge>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mt-1 text-sm text-muted">Nenhum ainda.</p>
                        )}
                    </div>
                </div>
                <div>
                    <p className="mb-3 text-xs text-subtle">Trilha de auditoria: cada evento leva o hash do anterior</p>
                    <AuditTrail events={data.events} technical />
                </div>
            </div>
        </details>
    )
}

function HashRow({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs text-subtle">{label}</p>
            <div className="mt-1 flex items-start gap-1">
                <p className="break-all font-mono text-xs leading-relaxed text-ink/80">{value}</p>
                <CopyButton value={value} label="Copiar hash" className="-mt-1 shrink-0" />
            </div>
        </div>
    )
}

function DownloadLink({ href, label, primary }: { href: string; label: string; primary?: boolean }) {
    return (
        <a
            href={href}
            download
            className={
                primary
                    ? 'flex h-11 items-center justify-between gap-2 rounded-[10px] bg-brand px-3.5 text-sm font-medium text-white transition-colors hover:bg-brand-hover'
                    : 'flex h-11 items-center justify-between gap-2 rounded-[10px] border border-line-strong px-3.5 text-sm font-medium text-ink transition-colors hover:bg-surface'
            }
        >
            {label}
            <Download className="size-4" aria-hidden />
        </a>
    )
}

export function TimestampLabel({ status }: { status: EnvelopeDetailDto['timestamp']['status'] }) {
    const map = {
        OK: <span className="font-medium text-emerald-700">Emitido</span>,
        PENDING: <span className="text-muted">Aguardando assinatura</span>,
        FAILED: <span className="text-amber-700">Indisponível no momento</span>,
        SKIPPED: <span className="text-muted">Desligado nesta instalação</span>,
    } as const
    return map[status]
}
