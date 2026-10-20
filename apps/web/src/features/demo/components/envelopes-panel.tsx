import { ArrowUpRight, FileSignature, ShieldCheck, ShieldX, Webhook } from 'lucide-react'
import { Link } from 'react-router'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Kicker, Skeleton } from '@/components/ui/primitives'
import { EmptyState, ErrorNotice } from '@/components/ui/states'
import { EnvelopeProgress, StatusPill, useEnvelopes } from '@/features/envelopes'
import { formatTimeSeconds, relativeTime } from '@/lib/format'
import { useResource } from '@/lib/use-resource'

import { demoApi, type DemoStatus, type ReceivedWebhook } from '../api'

export function EnvelopesPanel({ status, onGoToAttendance }: { status: DemoStatus | undefined; onGoToAttendance: () => void }) {
    const active = Boolean(status?.active)
    return (
        <div className="space-y-10">
            <div>
                <h2 className="text-2xl font-bold tracking-[-0.03em]">Envelopes</h2>
                <p className="mt-1 text-[15px] text-muted">
                    O andamento de cada contrato, ao vivo, e o que a LíderHub recebeu por webhook.
                </p>
            </div>
            {active ? (
                <>
                    <EnvelopeList onGoToAttendance={onGoToAttendance} />
                    <WebhookLog />
                </>
            ) : (
                <EmptyState
                    icon={<FileSignature />}
                    title="Nada por aqui ainda"
                    description="Ative o LíderSign e envie um contrato no Atendimento para acompanhar aqui."
                />
            )}
        </div>
    )
}

function EnvelopeList({ onGoToAttendance }: { onGoToAttendance: () => void }) {
    const { data, error, loading, reload, live } = useEnvelopes()

    if (loading && !data) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
            </div>
        )
    }
    if (error && !data) {
        return (
            <ErrorNotice
                message={error.message}
                action={
                    <Button variant="secondary" size="sm" onClick={() => void reload()}>
                        Tentar de novo
                    </Button>
                }
            />
        )
    }
    if (!data?.length) {
        return (
            <EmptyState
                icon={<FileSignature />}
                title="Nenhum contrato enviado"
                description="Gere o contrato da Maria no Atendimento. Ele aparece aqui na hora."
                action={<Button onClick={onGoToAttendance}>Ir para o Atendimento</Button>}
            />
        )
    }

    return (
        <section aria-labelledby="lista-envelopes" className="space-y-3">
            <div className="flex items-baseline justify-between gap-4">
                <Kicker id="lista-envelopes">Contratos enviados</Kicker>
                <p className="flex items-center gap-2 text-xs text-muted">
                    <span className={live ? 'size-1.5 rounded-full bg-emerald-500' : 'size-1.5 rounded-full bg-line-strong'} aria-hidden />
                    {live ? 'Ao vivo' : 'Atualizando a cada 3 s'}
                </p>
            </div>
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
                {data.map((envelope) => (
                    <li key={envelope.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate font-medium">{envelope.title}</p>
                                <StatusPill status={envelope.status} />
                            </div>
                            <p className="text-sm text-muted">
                                {envelope.signer.name} · <span className="font-mono text-xs tabular">{envelope.signer.phoneMasked}</span>
                            </p>
                            <EnvelopeProgress envelope={envelope} />
                        </div>
                        <Link
                            to={`/painel/envelopes/${envelope.id}`}
                            target="_blank"
                            className="inline-flex shrink-0 items-center gap-1 self-start text-sm font-medium text-brand hover:underline sm:self-center"
                        >
                            Trilha e arquivos <ArrowUpRight className="size-4" aria-hidden />
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    )
}

function WebhookLog() {
    const { data } = useResource<ReceivedWebhook[]>(demoApi.webhooksUrl, { refreshMs: 2000 })

    return (
        <section aria-labelledby="webhooks" className="space-y-3">
            <div className="flex items-baseline justify-between gap-4">
                <Kicker id="webhooks">Webhooks recebidos pela LíderHub</Kicker>
                <p className="text-xs text-muted">Assinados com HMAC-SHA256</p>
            </div>
            {data?.length ? (
                <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
                    {data.map((item, index) => (
                        <li key={`${item.receivedAt}-${index}`} className="flex items-center gap-4 px-5 py-3.5 animate-enter">
                            <Webhook className="size-4 shrink-0 text-subtle" aria-hidden />
                            <div className="min-w-0 flex-1">
                                <p className="truncate font-mono text-[13px] text-ink">{item.event ?? 'evento desconhecido'}</p>
                                <p className="text-xs text-subtle tabular">
                                    {formatTimeSeconds(item.receivedAt)} · {relativeTime(item.receivedAt)}
                                    {item.payload?.data.externalRef ? ` · ref. ${item.payload.data.externalRef}` : ''}
                                </p>
                            </div>
                            {item.verified ? (
                                <Badge tone="success">
                                    <ShieldCheck className="size-3.5" aria-hidden /> HMAC válido
                                </Badge>
                            ) : (
                                <Badge tone="danger" title={item.reason ?? undefined}>
                                    <ShieldX className="size-3.5" aria-hidden /> Assinatura inválida
                                </Badge>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="rounded-2xl border border-dashed border-line-strong px-5 py-6 text-sm text-muted">
                    Os webhooks aparecem aqui quando o cliente abrir e assinar o contrato.
                </p>
            )}
        </section>
    )
}
