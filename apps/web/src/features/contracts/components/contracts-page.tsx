import {
    envelopeEntry,
    FUNNEL_STALL_LABEL,
    importedEntry,
    summarizeFunnel,
    type EnvelopeDto,
    type FunnelEntry,
    type ImportedContractDto,
} from '@lidersign/shared'
import { BellRing, ChevronRight, FileSignature, Search } from 'lucide-react'
import * as React from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import {
    Button,
    cn,
    errorMessage,
    relativeTime,
    Skeleton,
    useDocumentTitle,
    useResource,
} from '@lidersign/ui'

import { AssistantHint } from '@/features/assistant'
import { useEnvelopes } from '@/features/envelopes'
import { inboxApi } from '@/features/inbox'
import { Page } from '@/features/shell'

import { contractsApi } from '../api'
import { FunnelChart } from './funnel-chart'

type StatusFilter = 'todos' | 'aguardando' | 'assinados' | 'encerrados'
type OriginFilter = 'todas' | 'liderhub' | 'zapsign'

type Row = FunnelEntry & { envelope?: EnvelopeDto; contactId?: string }

const STATUS_FILTERS: { value: StatusFilter; label: string; match: (row: Row) => boolean }[] = [
    { value: 'todos', label: 'Todos', match: () => true },
    { value: 'aguardando', label: 'Aguardando assinatura', match: (row) => row.open },
    { value: 'assinados', label: 'Assinados', match: (row) => row.stage === 'SIGNED' },
    { value: 'encerrados', label: 'Expirados ou cancelados', match: (row) => row.lost },
]

const STALL_MS = 60 * 60 * 1000

function when(iso: string) {
    const age = Date.now() - new Date(iso).getTime()
    if (age < 24 * 60 * 60 * 1000) return relativeTime(iso)
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
        new Date(iso),
    )
}

function percent(value: number) {
    return `${Math.round(value * 100)}%`
}

export function ContractsPage() {
    useDocumentTitle('Contratos')
    const [params, setParams] = useSearchParams()
    const envelopes = useEnvelopes()
    const imported = useResource<ImportedContractDto[]>(contractsApi.importedUrl)
    const status = (STATUS_FILTERS.find((item) => item.value === params.get('status'))?.value ??
        'todos') as StatusFilter
    const [origin, setOrigin] = React.useState<OriginFilter>('todas')
    const [query, setQuery] = React.useState('')
    const [nudging, setNudging] = React.useState<string | null>(null)

    const ours = React.useMemo<Row[]>(
        () =>
            (envelopes.data ?? []).map((envelope) => ({
                ...envelopeEntry(envelope),
                envelope,
                contactId: envelope.externalRef?.startsWith('contato:')
                    ? envelope.externalRef.slice(8)
                    : undefined,
            })),
        [envelopes.data],
    )
    const theirs = React.useMemo<Row[]>(() => (imported.data ?? []).map(importedEntry), [imported.data])
    const liderhub = summarizeFunnel(ours.filter((row) => row.envelope?.status !== 'CANCELED'))
    const zapsign = summarizeFunnel(theirs)
    const stalled = ours.filter(
        (row) => row.open && Date.now() - new Date(row.lastActivityAt).getTime() > STALL_MS,
    )

    const needle = query.trim().toLowerCase()
    const rows = [...(origin === 'zapsign' ? [] : ours), ...(origin === 'liderhub' ? [] : theirs)]
        .filter(STATUS_FILTERS.find((item) => item.value === status)!.match)
        .filter(
            (row) =>
                !needle ||
                row.signerName.toLowerCase().includes(needle) ||
                row.title.toLowerCase().includes(needle),
        )
        .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt))

    async function nudge(row: Row) {
        if (!row.envelope) return
        setNudging(row.id)
        try {
            await inboxApi.nudge(row.envelope.id)
            toast.success(`Lembrete enviado para ${row.signerName.split(' ')[0]} na conversa`)
        } catch (error) {
            toast.error(errorMessage(error))
        } finally {
            setNudging(null)
        }
    }

    async function nudgeAll() {
        setNudging('all')
        try {
            const result = await contractsApi.nudgeStalled()
            toast.success(
                result.count
                    ? `Lembrete enviado para ${result.count} ${result.count === 1 ? 'pessoa' : 'pessoas'}`
                    : 'Ninguém parado agora',
            )
        } catch (error) {
            toast.error(errorMessage(error))
        } finally {
            setNudging(null)
        }
    }

    const loading = (envelopes.loading && !envelopes.data) || (imported.loading && !imported.data)

    return (
        <Page
            title="Contratos"
            description="Cada etapa da assinatura na conversa do WhatsApp, comparada ao que acontecia com o link do ZapSign."
            actions={
                <Button asChild variant="secondary" size="sm">
                    <Link to="/atendimento">
                        <FileSignature aria-hidden /> Enviar pela Caixa de entrada
                    </Link>
                </Button>
            }
        >
            {liderhub.open ? (
                <AssistantHint
                    className="mb-8"
                    prompt="Lembre quem parou de assinar"
                    cta="Lembrar quem parou"
                >
                    {liderhub.open === 1 ? '1 contrato aguarda' : `${liderhub.open} contratos aguardam`}{' '}
                    assinatura
                    {stalled.length
                        ? `, ${stalled.length} parado${stalled.length > 1 ? 's' : ''} há mais de uma hora`
                        : ''}
                    . O Assistente lembra cada pessoa na própria conversa, de acordo com onde ela parou.
                </AssistantHint>
            ) : (
                <AssistantHint
                    className="mb-8"
                    prompt="Qual a taxa de fechamento, comparada ao ZapSign?"
                    cta="Comparar"
                >
                    Pergunte ao Assistente quanto o escritório fecha pela conversa, comparado ao link do
                    ZapSign.
                </AssistantHint>
            )}

            {loading ? (
                <Skeleton className="h-[360px] w-full rounded-2xl" />
            ) : (
                <section aria-labelledby="funil" className="rounded-2xl border border-line">
                    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-t-2xl border-b border-line bg-line lg:grid-cols-4">
                        <Metric
                            label="Taxa de fechamento"
                            value={liderhub.total ? percent(liderhub.closingRate) : '–'}
                            hint={
                                liderhub.total && liderhub.total < 5
                                    ? `${liderhub.reached.SIGNED} de ${liderhub.total} · amostra ainda pequena`
                                    : `${liderhub.reached.SIGNED} de ${liderhub.total} pela conversa`
                            }
                            accent
                        />
                        <Metric
                            label="No ZapSign era"
                            value={percent(zapsign.closingRate)}
                            hint={`${zapsign.reached.SIGNED} de ${zapsign.total} pelo link`}
                        />
                        <Metric
                            label="Aguardando assinatura"
                            value={String(liderhub.open)}
                            hint={
                                stalled.length ? `${stalled.length} parados há mais de 1 h` : 'Ninguém parado'
                            }
                        />
                        <Metric
                            label="Assinados"
                            value={String(liderhub.reached.SIGNED)}
                            hint="com PDF selado e carimbo do tempo"
                        />
                    </dl>
                    <div className="p-5 sm:p-7">
                        <h2 id="funil" className="text-lg font-semibold tracking-[-0.02em]">
                            Onde as pessoas param
                        </h2>
                        <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-muted">
                            De cada 100 que recebem o contrato, quantas chegam a cada etapa. No link avulso, a
                            maioria nem abre.
                        </p>
                        <div className="mt-6">
                            <FunnelChart liderhub={liderhub} zapsign={zapsign} />
                        </div>
                    </div>
                </section>
            )}

            <section aria-labelledby="lista" className="mt-12">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <h2 id="lista" className="text-lg font-semibold tracking-[-0.02em]">
                            Todos os contratos
                        </h2>
                        <div
                            className="mt-3 flex flex-wrap gap-1.5"
                            role="group"
                            aria-label="Filtrar por situação"
                        >
                            {STATUS_FILTERS.map((item) => (
                                <button
                                    key={item.value}
                                    type="button"
                                    aria-pressed={status === item.value}
                                    onClick={() =>
                                        setParams(item.value === 'todos' ? {} : { status: item.value }, {
                                            replace: true,
                                        })
                                    }
                                    className={cn(
                                        'h-8 rounded-lg border px-3 text-sm transition-colors',
                                        status === item.value
                                            ? 'border-ink/15 bg-surface font-medium text-ink'
                                            : 'border-line text-muted hover:bg-surface/60',
                                    )}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {stalled.length ? (
                            <Button
                                variant="secondary"
                                size="sm"
                                loading={nudging === 'all'}
                                onClick={() => void nudgeAll()}
                            >
                                <BellRing aria-hidden /> Lembrar parados
                            </Button>
                        ) : null}
                        <select
                            aria-label="Origem"
                            value={origin}
                            onChange={(event) => setOrigin(event.target.value as OriginFilter)}
                            className="h-9 rounded-lg border border-line bg-white px-3 text-sm"
                        >
                            <option value="todas">Todas as origens</option>
                            <option value="liderhub">LíderHub</option>
                            <option value="zapsign">ZapSign (importado)</option>
                        </select>
                        <label className="flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-sm focus-within:border-brand/50">
                            <Search className="size-4 text-subtle" aria-hidden />
                            <span className="sr-only">Buscar contrato</span>
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Buscar cliente ou documento"
                                className="w-48 bg-transparent outline-none placeholder:text-subtle"
                            />
                        </label>
                    </div>
                </div>

                <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
                    {loading ? (
                        <Skeleton className="h-64 w-full" />
                    ) : rows.length ? (
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="border-b border-line bg-surface/70 text-xs text-muted">
                                <tr>
                                    <th className="px-5 py-3 font-medium">Cliente</th>
                                    <th className="px-5 py-3 font-medium">Documento</th>
                                    <th className="px-5 py-3 font-medium">Origem</th>
                                    <th className="px-5 py-3 font-medium">Onde está</th>
                                    <th className="px-5 py-3 font-medium">Última movimentação</th>
                                    <th className="px-5 py-3 text-right font-medium">
                                        <span className="sr-only">Ações</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.slice(0, 120).map((row) => (
                                    <tr
                                        key={`${row.origin}:${row.id}`}
                                        className="border-b border-line last:border-0"
                                    >
                                        <td className="whitespace-nowrap px-5 py-3 font-medium">
                                            {row.envelope ? (
                                                <Link
                                                    to={`/contratos/${row.id}`}
                                                    className="hover:text-brand"
                                                >
                                                    {row.signerName}
                                                </Link>
                                            ) : (
                                                row.signerName
                                            )}
                                        </td>
                                        <td
                                            className="max-w-[240px] truncate px-5 py-3 text-ink/80"
                                            title={row.title}
                                        >
                                            {row.title}
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3">
                                            <OriginBadge row={row} />
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3">
                                            <StageCell row={row} />
                                        </td>
                                        <td className="whitespace-nowrap px-5 py-3 text-muted tabular">
                                            {when(row.lastActivityAt)}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            {row.envelope ? (
                                                <div className="flex items-center justify-end gap-1">
                                                    {row.open ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            loading={nudging === row.id}
                                                            onClick={() => void nudge(row)}
                                                        >
                                                            <BellRing aria-hidden /> Lembrar
                                                        </Button>
                                                    ) : null}
                                                    <Button
                                                        asChild
                                                        variant="ghost"
                                                        size="icon"
                                                        className="size-8"
                                                        aria-label={`Abrir contrato de ${row.signerName}`}
                                                    >
                                                        <Link to={`/contratos/${row.id}`}>
                                                            <ChevronRight aria-hidden />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-subtle">importado</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center px-6 py-14 text-center">
                            <span className="flex size-11 items-center justify-center rounded-full bg-surface">
                                <FileSignature className="size-5 text-subtle" aria-hidden />
                            </span>
                            <p className="mt-3 font-medium">Nenhum contrato com esse filtro</p>
                            <p className="mt-1 max-w-sm text-sm text-muted">
                                Os contratos saem pela Caixa de entrada, na conversa com o cliente.
                            </p>
                        </div>
                    )}
                </div>
                {theirs.length ? (
                    <p className="mt-3 text-xs text-subtle">
                        Os contratos marcados como ZapSign são um histórico de exemplo, gerado para a
                        demonstração.
                    </p>
                ) : null}
            </section>
        </Page>
    )
}

function Metric({
    label,
    value,
    hint,
    accent,
}: {
    label: string
    value: string
    hint: string
    accent?: boolean
}) {
    return (
        <div className="bg-white px-5 py-5 sm:px-7">
            <dt className="text-[13px] text-muted">{label}</dt>
            <dd
                className={cn(
                    'mt-1.5 text-[28px] font-bold tracking-[-0.03em] tabular',
                    accent && 'text-brand',
                )}
            >
                {value}
            </dd>
            <dd className="mt-0.5 text-xs text-subtle">{hint}</dd>
        </div>
    )
}

function OriginBadge({ row }: { row: Row }) {
    if (row.origin === 'zapsign') {
        return (
            <span className="inline-flex rounded-md border border-line px-1.5 py-0.5 text-xs text-muted">
                ZapSign
            </span>
        )
    }
    return (
        <span className="inline-flex rounded-md bg-brand-soft px-1.5 py-0.5 text-xs font-medium text-brand">
            LíderHub · {row.envelope?.channel === 'LINK' ? 'link' : 'conversa'}
        </span>
    )
}

function StageCell({ row }: { row: Row }) {
    if (row.lost) {
        return (
            <span className="text-muted">
                {row.envelope?.status === 'CANCELED' ? 'Cancelado' : 'Expirou'}
            </span>
        )
    }
    if (row.stage === 'SIGNED') {
        return (
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                <span aria-hidden className="size-1.5 rounded-full bg-emerald-600" /> Assinado
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1.5 text-amber-800">
            <span aria-hidden className="size-1.5 rounded-full bg-amber-500" />{' '}
            {row.origin === 'zapsign' && row.stage === 'VIEWED'
                ? 'Abriu, não assinou'
                : FUNNEL_STALL_LABEL[row.stage]}
        </span>
    )
}
