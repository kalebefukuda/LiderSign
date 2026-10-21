import {
    ASSURANCE_LEVEL_LABEL,
    type EnvelopeDetailDto,
    type MessageKind,
    type StreamEvent,
} from '@lidersign/shared'
import {
    ArrowLeft,
    BadgeCheck,
    BellRing,
    CheckCircle2,
    ChevronDown,
    Clock,
    Download,
    ExternalLink,
    Loader2,
    MessageCircle,
    RefreshCw,
    ShieldCheck,
    XCircle,
} from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import {
    Button,
    CopyButton,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    EmptyState,
    ErrorNotice,
    Skeleton,
    cn,
    errorMessage,
    firstName,
    formatDateTime,
    formatDateTimeLong,
    useDocumentTitle,
    useResource,
} from '@lidersign/ui'

import { AuditTrail, envelopesApi, StatusPill } from '@/features/envelopes'
import { inboxApi } from '@/features/inbox'
import { useLiveEvents } from '@/features/realtime'

const MESSAGE_KIND_LABEL: Record<MessageKind, string> = {
    SIGNING_LINK: 'Link de assinatura',
    OTP: 'Código de confirmação',
    SIGNED_COPY: 'Via assinada',
    REMINDER: 'Lembrete',
    TEST: 'Mensagem de teste',
    CONVERSATION: 'Mensagem na conversa',
    INBOUND: 'Resposta do cliente',
}

const FINAL = ['COMPLETED', 'CANCELED', 'EXPIRED']

function hideOtp(body: string) {
    return body.replace(/\b\d{6}\b/g, '••••••')
}

export function ContractDetail({ id }: { id: string }) {
    const [final, setFinal] = React.useState(false)
    const { data, error, loading, reload } = useResource<EnvelopeDetailDto>(envelopesApi.detailUrl(id), {
        refreshMs: final ? 0 : 5000,
    })
    const [busy, setBusy] = React.useState<'nudge' | 'cancel' | null>(null)
    const [confirmCancel, setConfirmCancel] = React.useState(false)
    useDocumentTitle(data ? `${data.title} · ${data.signer.name}` : 'Contrato')

    React.useEffect(() => {
        if (data) setFinal(FINAL.includes(data.status) && data.timestamp.status !== 'PENDING')
    }, [data])

    useLiveEvents((event: StreamEvent) => {
        if (event.type === 'envelope.updated' && event.envelope.id === id) void reload()
    })

    async function act(action: 'nudge' | 'cancel') {
        setBusy(action)
        try {
            if (action === 'nudge') {
                await inboxApi.nudge(id)
                toast.success('Lembrete enviado na conversa')
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
                title="Contrato não encontrado"
                description="Ele pode ter sido apagado ao recomeçar a demonstração."
                action={
                    <Button asChild variant="secondary">
                        <Link to="/contratos">Voltar para Contratos</Link>
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
    const open = data.status === 'SENT' || data.status === 'VIEWED'
    const first = firstName(data.signer.name)
    const contactId = data.externalRef?.startsWith('contato:') ? data.externalRef.slice(8) : null

    return (
        <div className="space-y-10 animate-enter">
            <div>
                <Link
                    to="/contratos"
                    className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
                >
                    <ArrowLeft className="size-4" /> Contratos
                </Link>
                <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-2xl font-bold tracking-[-0.03em] sm:text-[28px]">
                                {data.title}
                            </h1>
                            <StatusPill status={data.status} />
                        </div>
                        <p className="mt-1.5 text-[15px] text-muted">
                            Para <span className="text-ink">{data.signer.name}</span> ·{' '}
                            {data.channel === 'WHATSAPP' ? 'na conversa do WhatsApp' : 'por link'} · enviado
                            em{' '}
                            <span className="tabular">{formatDateTime(data.sentAt ?? data.createdAt)}</span>
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {contactId ? (
                            <Button asChild variant="secondary" size="sm">
                                <Link to={`/atendimento?contato=${encodeURIComponent(contactId)}`}>
                                    <MessageCircle aria-hidden /> Abrir conversa
                                </Link>
                            </Button>
                        ) : null}
                        {open ? (
                            <>
                                <Button
                                    size="sm"
                                    loading={busy === 'nudge'}
                                    onClick={() => void act('nudge')}
                                >
                                    <BellRing aria-hidden /> Lembrar agora
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setConfirmCancel(true)}>
                                    <XCircle aria-hidden /> Cancelar
                                </Button>
                            </>
                        ) : null}
                    </div>
                </div>
            </div>

            <Progress envelope={data} />

            {data.status === 'SIGNED' ? (
                <Notice icon={<Loader2 className="size-5 animate-spin text-brand" aria-hidden />}>
                    {first} assinou. Estamos selando o PDF e pedindo o carimbo do tempo, leva poucos segundos.
                </Notice>
            ) : null}

            {data.status === 'COMPLETED' ? (
                <section className="flex flex-col gap-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-600" aria-hidden />
                        <div>
                            <h2 className="text-xl font-bold tracking-[-0.02em]">{first} assinou</h2>
                            <p className="mt-1 text-[15px] text-ink/80">
                                Em {formatDateTimeLong(data.signedAt ?? data.completedAt!)}. A via assinada já
                                foi para a conversa de {first}.
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
                        ? 'Este envio foi cancelado. A assinatura deixou de valer na conversa e no link.'
                        : `O prazo para assinar acabou em ${formatDateTime(data.expiresAt)}. Envie o contrato de novo pela conversa.`}
                </Notice>
            ) : null}

            <Guarantees data={data} id={id} />

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <section aria-labelledby="historico">
                    <h2 id="historico" className="mb-4 text-lg font-semibold tracking-[-0.02em]">
                        Histórico
                    </h2>
                    <div className="rounded-2xl border border-line p-6">
                        {data.events.length ? (
                            <AuditTrail events={data.events} />
                        ) : (
                            <p className="text-sm text-muted">Nada registrado ainda.</p>
                        )}
                    </div>
                </section>
                <aside className="space-y-6 lg:pt-11">
                    <div className="space-y-3 rounded-2xl border border-line p-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                            Quem assina
                        </p>
                        <div>
                            <p className="text-[15px] font-medium">{data.signer.name}</p>
                            <p className="mt-1 font-mono text-[13px] text-muted tabular">
                                CPF {data.signer.cpfMasked} · {data.signer.phoneMasked}
                            </p>
                        </div>
                        <p className="text-sm leading-relaxed text-muted">
                            Nível {ASSURANCE_LEVEL_LABEL[data.assuranceLevel].toLowerCase()}:{' '}
                            {data.assuranceLevel === 'REFORCADO'
                                ? 'confirma o CPF e manda uma selfie antes de assinar.'
                                : 'confirma o CPF e assina.'}
                        </p>
                    </div>
                    <div className="space-y-2 rounded-2xl border border-line p-6">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                            Arquivos
                        </p>
                        {data.status === 'COMPLETED' ? (
                            <DownloadLink
                                href={envelopesApi.fileUrl(id, 'signed')}
                                label="PDF assinado"
                                primary
                            />
                        ) : null}
                        <DownloadLink
                            href={envelopesApi.fileUrl(id, 'original')}
                            label="PDF enviado (sem assinatura)"
                        />
                    </div>
                </aside>
            </div>

            <TechnicalDetails data={data} />

            <Dialog open={confirmCancel} onOpenChange={setConfirmCancel}>
                <DialogContent className="p-6">
                    <DialogTitle>Cancelar este envio?</DialogTitle>
                    <DialogDescription className="mt-2">
                        O cliente não consegue mais assinar, nem pela conversa nem pelo link. Para assinar
                        depois, será preciso enviar de novo.
                    </DialogDescription>
                    <div className="mt-6 flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
                            Manter
                        </Button>
                        <Button variant="dark" loading={busy === 'cancel'} onClick={() => void act('cancel')}>
                            Cancelar envio
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

function Progress({ envelope }: { envelope: EnvelopeDetailDto }) {
    const stopped = envelope.status === 'CANCELED' || envelope.status === 'EXPIRED'
    const steps = [
        { label: 'Recebeu', at: envelope.sentAt ?? envelope.createdAt },
        { label: envelope.channel === 'WHATSAPP' ? 'Respondeu' : 'Abriu o link', at: envelope.viewedAt },
        { label: 'Confirmou o CPF', at: envelope.identityConfirmedAt },
        { label: 'Assinou', at: envelope.signedAt },
        { label: 'PDF selado', at: envelope.completedAt },
    ]
    const current = steps.findIndex((step) => !step.at)
    return (
        <ol aria-label="Andamento" className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-5">
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
                        <p
                            className={cn(
                                'mt-2.5 text-sm font-medium',
                                done ? 'text-ink' : active ? 'text-ink/70' : 'text-subtle',
                            )}
                        >
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

/** O que dá validade ao documento, à vista: selo, carimbo do tempo e código público. */
function Guarantees({ data, id }: { data: EnvelopeDetailDto; id: string }) {
    const stamp = data.timestamp
    const sealed = Boolean(data.signedSha256)
    return (
        <section aria-labelledby="garantias">
            <h2 id="garantias" className="mb-4 text-lg font-semibold tracking-[-0.02em]">
                Garantias do documento
            </h2>
            <dl className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
                <div className="bg-white p-5">
                    <dt className="flex items-center gap-2 text-sm font-medium">
                        <ShieldCheck className="size-4 text-brand" aria-hidden /> Selo de integridade
                    </dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-muted">
                        {sealed
                            ? 'Aplicado (PAdES). Qualquer alteração no PDF quebra o selo.'
                            : 'Aplicado assim que o cliente assinar.'}
                    </dd>
                </div>
                <div className="bg-white p-5">
                    <dt className="flex items-center gap-2 text-sm font-medium">
                        <Clock className="size-4 text-brand" aria-hidden /> Carimbo do tempo (RFC 3161)
                    </dt>
                    <dd className="mt-1.5 text-sm leading-relaxed text-muted">
                        {stamp.status === 'OK' && stamp.genTime ? (
                            <>
                                Emitido por <span className="text-ink">{stamp.tsa}</span> em{' '}
                                <span className="tabular">{formatDateTimeLong(stamp.genTime)}</span>. Prova a
                                data por uma autoridade externa.{' '}
                                <a
                                    href={envelopesApi.fileUrl(id, 'timestamp')}
                                    download
                                    className="text-brand hover:underline"
                                >
                                    Baixar .tsr
                                </a>
                            </>
                        ) : stamp.status === 'PENDING' ? (
                            'Pedido à autoridade de carimbo assim que o cliente assinar.'
                        ) : stamp.status === 'SKIPPED' ? (
                            'Desligado nesta instalação.'
                        ) : (
                            'A autoridade não respondeu na selagem; a falha ficou registrada na trilha.'
                        )}
                    </dd>
                </div>
                <div className="bg-white p-5">
                    <dt className="flex items-center gap-2 text-sm font-medium">
                        <BadgeCheck className="size-4 text-brand" aria-hidden /> Código de verificação
                    </dt>
                    <dd className="mt-1.5 flex items-center gap-1">
                        <span className="font-mono text-[17px] tracking-wide">{data.verificationCode}</span>
                        <CopyButton value={data.verificationCode} />
                    </dd>
                    <dd className="text-sm text-muted">
                        Impresso no PDF.{' '}
                        <Link to="/v" className="text-brand hover:underline">
                            Verificar documento
                        </Link>
                    </dd>
                </div>
            </dl>
        </section>
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

function TechnicalDetails({ data }: { data: EnvelopeDetailDto }) {
    return (
        <details className="group rounded-2xl border border-line">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 text-sm font-medium text-muted transition-colors hover:text-ink [&::-webkit-details-marker]:hidden">
                Detalhes técnicos e trilha de auditoria
                <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="grid gap-8 border-t border-line px-6 py-6 lg:grid-cols-2">
                <div className="space-y-5">
                    <HashRow label="SHA-256 do PDF enviado" value={data.originalSha256} />
                    {data.signedSha256 ? (
                        <HashRow label="SHA-256 do PDF assinado" value={data.signedSha256} />
                    ) : null}
                    <div>
                        <p className="text-xs text-subtle">Mensagens da assinatura</p>
                        {data.messages.length ? (
                            <ul className="mt-2 space-y-2">
                                {data.messages.map((message) => (
                                    <li key={message.id} className="text-sm">
                                        <span className="font-medium">
                                            {MESSAGE_KIND_LABEL[message.kind] ?? message.kind}
                                        </span>{' '}
                                        <span className="text-subtle tabular">
                                            {formatDateTime(message.createdAt)}
                                        </span>
                                        <p className="line-clamp-1 text-muted">{hideOtp(message.body)}</p>
                                        <p className="text-xs text-subtle">
                                            {message.provider === 'simulator'
                                                ? 'WhatsApp simulado na demonstração'
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
                </div>
                <div>
                    <p className="mb-3 text-xs text-subtle">
                        Trilha de auditoria: cada evento leva o hash do anterior
                    </p>
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
