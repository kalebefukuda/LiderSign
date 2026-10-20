import {
    ASSURANCE_LEVEL_LABEL,
    type EnvelopeDetailDto,
    type MessageKind,
    type StreamEvent,
} from '@lidersign/shared'
import { ArrowLeft, Download, ExternalLink, RefreshCw, Send, ShieldCheck, XCircle } from 'lucide-react'
import { Link } from 'react-router'
import * as React from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Card, Kicker, Skeleton } from '@/components/ui/primitives'
import { CopyButton, EmptyState, ErrorNotice } from '@/components/ui/states'
import { useLiveEvents } from '@/features/realtime'
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
                toast.success('Novo link gerado. O anterior deixou de valer.')
            } else {
                await envelopesApi.cancel(id)
                toast.success('Envelope cancelado')
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
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
        )
    }

    if (error && !data) {
        return error.status === 404 ? (
            <EmptyState
                title="Envelope não encontrado"
                description="Ele pode ter sido apagado ao reiniciar a demonstração."
                action={
                    <Button asChild variant="secondary">
                        <Link to="/painel/envelopes">Voltar para envelopes</Link>
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
                        <p className="mt-1.5 text-sm text-muted">
                            Enviado em <span className="tabular">{formatDateTime(data.sentAt ?? data.createdAt)}</span>
                            {data.externalRef ? <> · ref. {data.externalRef}</> : null}
                        </p>
                    </div>
                    {canAct ? (
                        <div className="flex gap-2">
                            <Button variant="secondary" size="sm" loading={busy === 'resend'} onClick={() => act('resend')}>
                                <Send aria-hidden /> Reenviar link
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => setConfirmCancel(true)}>
                                <XCircle aria-hidden /> Cancelar
                            </Button>
                        </div>
                    ) : null}
                </div>
            </div>

            {canAct ? (
                <SigningLinkCard key={linkVersion} envelopeId={id} signerFirstName={firstName(data.signer.name)} />
            ) : null}

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                <div className="space-y-6">
                    <Card className="grid gap-x-8 gap-y-5 p-6 sm:grid-cols-2">
                        <Info label="Signatário" value={data.signer.name} />
                        <Info label="CPF" value={data.signer.cpfMasked} mono />
                        <Info label="Celular" value={data.signer.phoneMasked} mono />
                        <Info label="Nível de garantia" value={ASSURANCE_LEVEL_LABEL[data.assuranceLevel]} />
                        <div className="sm:col-span-2">
                            <Kicker>Código de verificação</Kicker>
                            <div className="mt-1.5 flex items-center gap-2">
                                <span className="font-mono text-[15px] tracking-wide">{data.verificationCode}</span>
                                <CopyButton value={data.verificationCode} />
                                <Link
                                    to={`/v/${encodeURIComponent(data.verificationCode)}`}
                                    className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
                                >
                                    Abrir verificação <ExternalLink className="size-3.5" />
                                </Link>
                            </div>
                        </div>
                    </Card>

                    <section aria-labelledby="trilha">
                        <div className="mb-4 flex items-baseline justify-between gap-4">
                            <h2 id="trilha" className="text-lg font-semibold tracking-[-0.02em]">
                                Trilha de auditoria
                            </h2>
                            <p className="text-xs text-subtle">Cada evento leva o hash do anterior</p>
                        </div>
                        <Card className="p-6">
                            {data.events.length ? (
                                <AuditTrail events={data.events} />
                            ) : (
                                <p className="text-sm text-muted">Nenhum evento registrado.</p>
                            )}
                        </Card>
                    </section>
                </div>

                <aside className="space-y-6">
                    <Card className="p-6">
                        <Kicker>Arquivos</Kicker>
                        <div className="mt-4 flex flex-col gap-2">
                            <DownloadLink href={envelopesApi.fileUrl(id, 'original')} label="PDF original" />
                            {data.status === 'COMPLETED' ? (
                                <DownloadLink href={envelopesApi.fileUrl(id, 'signed')} label="PDF assinado e selado" primary />
                            ) : (
                                <p className="rounded-[10px] border border-dashed border-line-strong px-3.5 py-3 text-sm text-muted">
                                    O PDF assinado aparece aqui quando o cliente concluir.
                                </p>
                            )}
                            {data.timestamp.status === 'OK' ? (
                                <DownloadLink href={envelopesApi.fileUrl(id, 'timestamp')} label="Carimbo do tempo (.tsr)" />
                            ) : null}
                        </div>
                    </Card>

                    <Card className="space-y-4 p-6">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="size-4 text-brand" aria-hidden />
                            <Kicker className="text-ink/70">Integridade</Kicker>
                        </div>
                        <HashRow label="SHA-256 do original" value={data.originalSha256} />
                        {data.signedSha256 ? <HashRow label="SHA-256 do assinado" value={data.signedSha256} /> : null}
                        <div>
                            <p className="text-xs text-subtle">Carimbo do tempo</p>
                            <p className="mt-1 text-sm">
                                <TimestampLabel status={data.timestamp.status} />
                                {data.timestamp.genTime ? (
                                    <span className="text-muted tabular"> · {formatDateTimeLong(data.timestamp.genTime)}</span>
                                ) : null}
                            </p>
                            {data.timestamp.tsa ? <p className="mt-0.5 text-xs text-subtle">{data.timestamp.tsa}</p> : null}
                        </div>
                    </Card>

                    <Card className="p-6">
                        <Kicker>Mensagens no WhatsApp</Kicker>
                        {data.messages.length ? (
                            <ul className="mt-4 space-y-4">
                                {data.messages.map((message) => (
                                    <li key={message.id} className="text-sm">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="font-medium">{MESSAGE_KIND_LABEL[message.kind]}</p>
                                            <span className="text-xs text-subtle tabular">
                                                {formatDateTime(message.createdAt)}
                                            </span>
                                        </div>
                                        <p className="mt-1 line-clamp-2 text-muted">{hideOtp(message.body)}</p>
                                        <p className="mt-1 text-xs text-subtle">
                                            {message.provider === 'simulator' ? 'Modo demonstração, não saiu do computador' : 'WhatsApp oficial'} ·{' '}
                                            {message.status === 'FAILED' ? (
                                                <span className="text-red-600">falhou{message.error ? `: ${message.error}` : ''}</span>
                                            ) : (
                                                message.toMasked
                                            )}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mt-3 text-sm text-muted">Nenhuma mensagem enviada.</p>
                        )}
                    </Card>

                    <Card className="p-6">
                        <Kicker>Webhooks para a LíderHub</Kicker>
                        {data.webhookDeliveries.length ? (
                            <ul className="mt-4 space-y-3">
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
                            <p className="mt-3 text-sm text-muted">Nenhum webhook entregue ainda.</p>
                        )}
                    </Card>
                </aside>
            </div>

            <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
                <DialogContent className="p-6">
                    <DialogTitle>Cancelar este envelope?</DialogTitle>
                    <DialogDescription className="mt-2">
                        O link de assinatura deixa de funcionar na hora. Para assinar depois, será preciso enviar um
                        novo documento.
                    </DialogDescription>
                    <div className="mt-6 flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
                            Manter
                        </Button>
                        <Button variant="dark" loading={busy === 'cancel'} onClick={() => act('cancel')}>
                            Cancelar envelope
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div>
            <Kicker>{label}</Kicker>
            <p className={mono ? 'mt-1.5 font-mono text-[15px] tabular' : 'mt-1.5 text-[15px]'}>{value}</p>
        </div>
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
