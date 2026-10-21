import type { EnvelopeDto } from '@lidersign/shared'
import { ArrowRight, ArrowUpRight, CheckCircle2, Clock3, RefreshCw } from 'lucide-react'
import * as React from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'

import { Button, Skeleton, errorMessage, formatDateTime, useDocumentTitle } from '@lidersign/ui'

import {
    EnvelopeTable,
    envelopeMetrics,
    envelopesApi,
    formatDuration,
    formatWaiting,
    rememberLink,
    useEnvelopes,
} from '@/features/envelopes'
import { partnerLink, useOffice } from '@/features/office'

const percent = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 })

export default function HomeRoute() {
    useDocumentTitle('Início')
    const office = useOffice()
    const { data, loading } = useEnvelopes()
    const metrics = React.useMemo(() => envelopeMetrics(data ?? []), [data])
    const partnerInbox = partnerLink(office, '/atendimento')

    const tiles = [
        {
            label: 'Assinados no mês',
            value: String(metrics.signedThisMonth),
            hint: 'Contratos concluídos desde o dia 1º',
        },
        {
            label: 'Aguardando assinatura',
            value: String(metrics.pending),
            hint: metrics.stale.length
                ? `${metrics.stale.length} parado${metrics.stale.length > 1 ? 's' : ''} há mais de 2 dias`
                : 'Nenhum parado há mais de 2 dias',
        },
        {
            label: 'Taxa de assinatura',
            value: metrics.rateLast30 === null ? '·' : percent.format(metrics.rateLast30),
            hint: metrics.sentLast30
                ? `${metrics.signedLast30} de ${metrics.sentLast30} enviados em 30 dias`
                : 'Sem envios nos últimos 30 dias',
        },
        {
            label: 'Tempo até assinar',
            value: metrics.averageSignMs === null ? '·' : formatDuration(metrics.averageSignMs),
            hint: 'Média entre o envio e a assinatura',
        },
    ]

    return (
        <div className="space-y-10 animate-enter">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-[28px] font-bold tracking-[-0.03em]">Início</h1>
                    <p className="mt-1.5 max-w-[62ch] text-muted">
                        Os contratos saem pelas conversas da {office.partner.name}. Aqui você acompanha o
                        andamento, cobra quem não assinou e cuida dos modelos.
                    </p>
                </div>
                {partnerInbox ? (
                    <a
                        href={partnerInbox}
                        className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:underline"
                    >
                        Enviar pela {office.partner.name} <ArrowUpRight className="size-4" aria-hidden />
                    </a>
                ) : null}
            </div>

            <section
                aria-label="Indicadores"
                className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4"
            >
                {tiles.map((tile) => (
                    <div key={tile.label} className="bg-white p-5">
                        <p className="text-sm text-muted">{tile.label}</p>
                        {loading && !data ? (
                            <Skeleton className="mt-3 h-8 w-16" />
                        ) : (
                            <p className="mt-2 text-[32px] font-bold leading-none tracking-[-0.03em] tabular">
                                {tile.value}
                            </p>
                        )}
                        <p className="mt-3 text-[13px] text-subtle">{tile.hint}</p>
                    </div>
                ))}
            </section>

            <Attention
                stale={metrics.stale}
                loading={loading && !data}
                sendsByWhatsApp={office.whatsappProvider === 'cloud_api'}
            />

            <section className="space-y-4">
                <div className="flex items-baseline justify-between gap-4">
                    <h2 className="text-lg font-semibold tracking-[-0.02em]">Últimos documentos</h2>
                    <Link
                        to="/painel/envelopes"
                        className="inline-flex items-center gap-1 text-sm text-brand hover:underline"
                    >
                        Ver todos <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                </div>
                <EnvelopeTable limit={5} />
            </section>

            <p className="flex items-center gap-2 text-sm text-muted">
                <CheckCircle2 className="size-4 text-emerald-600" aria-hidden />
                Conectado à {office.partner.name} desde {formatDateTime(office.tenant.createdAt)}. Sem token:
                a {office.partner.name} cuida da conexão.
            </p>
        </div>
    )
}

function Attention({
    stale,
    loading,
    sendsByWhatsApp,
}: {
    stale: EnvelopeDto[]
    loading: boolean
    sendsByWhatsApp: boolean
}) {
    const navigate = useNavigate()
    const [busy, setBusy] = React.useState<string | null>(null)
    const [done, setDone] = React.useState<Set<string>>(() => new Set())

    async function resend(envelope: EnvelopeDto) {
        setBusy(envelope.id)
        try {
            const updated = await envelopesApi.resend(envelope.id)
            rememberLink(envelope.id, updated.signingUrl)
            setDone((current) => new Set(current).add(envelope.id))
            if (sendsByWhatsApp) {
                toast.success(`Novo link enviado para ${envelope.signer.name.split(' ')[0]} pelo WhatsApp.`)
            } else {
                toast.success('Novo link pronto. Envie pelo WhatsApp do escritório.')
                navigate(`/painel/envelopes/${envelope.id}`)
            }
        } catch (error) {
            toast.error(errorMessage(error))
        } finally {
            setBusy(null)
        }
    }

    if (loading) return null

    return (
        <section className="space-y-4" aria-labelledby="atencao">
            <h2 id="atencao" className="text-lg font-semibold tracking-[-0.02em]">
                Precisam de um empurrão
            </h2>
            {!stale.length ? (
                <p className="rounded-2xl border border-line px-5 py-6 text-sm text-muted">
                    Nada parado. Os documentos pendentes têm menos de 2 dias.
                </p>
            ) : (
                <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
                    {stale.slice(0, 5).map((envelope) => (
                        <li
                            key={envelope.id}
                            className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="min-w-0">
                                <Link
                                    to={`/painel/envelopes/${envelope.id}`}
                                    className="font-medium hover:underline"
                                >
                                    {envelope.signer.name}
                                </Link>
                                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                                    <Clock3 className="size-3.5" aria-hidden />
                                    {envelope.title} ·{' '}
                                    {envelope.viewedAt ? 'abriu e não assinou' : 'ainda não abriu'} · enviado{' '}
                                    {formatWaiting(envelope.sentAt ?? envelope.createdAt)}
                                </p>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                loading={busy === envelope.id}
                                disabled={done.has(envelope.id)}
                                onClick={() => void resend(envelope)}
                            >
                                <RefreshCw aria-hidden />{' '}
                                {done.has(envelope.id) ? 'Link reenviado' : 'Reenviar link'}
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}
