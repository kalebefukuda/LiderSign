import type { EnvelopeDto } from '@lidersign/shared'
import { FileSignature, RefreshCw, Search } from 'lucide-react'
import * as React from 'react'
import { Link, useSearchParams } from 'react-router'

import { Button, EmptyState, ErrorNotice, NativeSelect, Skeleton, cn, formatDateTime } from '@lidersign/ui'

import { partnerLink, useOffice } from '@/features/office'

import { useEnvelopes } from '../hooks'
import { StatusPill } from './status-pill'

const STATUS_FILTERS = [
    { value: 'todos', label: 'Todos', match: () => true },
    {
        value: 'aguardando',
        label: 'Aguardando',
        match: (e: EnvelopeDto) => e.status === 'SENT' || e.status === 'VIEWED',
    },
    {
        value: 'assinados',
        label: 'Assinados',
        match: (e: EnvelopeDto) => e.status === 'SIGNED' || e.status === 'COMPLETED',
    },
    {
        value: 'encerrados',
        label: 'Cancelados ou expirados',
        match: (e: EnvelopeDto) => e.status === 'CANCELED' || e.status === 'EXPIRED',
    },
] as const

const PERIODS = [
    { value: 'todos', label: 'Qualquer data', days: null },
    { value: '7', label: 'Últimos 7 dias', days: 7 },
    { value: '30', label: 'Últimos 30 dias', days: 30 },
    { value: '90', label: 'Últimos 90 dias', days: 90 },
] as const

function useFilters(envelopes: EnvelopeDto[]) {
    const [params, setParams] = useSearchParams()
    const status = STATUS_FILTERS.find((item) => item.value === params.get('status')) ?? STATUS_FILTERS[0]
    const period = PERIODS.find((item) => item.value === params.get('periodo')) ?? PERIODS[0]
    const template = params.get('modelo') ?? ''
    const query = params.get('q') ?? ''

    const set = (key: string, value: string) =>
        setParams(
            (current) => {
                const next = new URLSearchParams(current)
                if (!value || value === 'todos') next.delete(key)
                else next.set(key, value)
                return next
            },
            { replace: true },
        )

    const templates = React.useMemo(() => {
        const seen = new Map<string, string>()
        for (const envelope of envelopes)
            if (!seen.has(envelope.templateId)) seen.set(envelope.templateId, envelope.title)
        return [...seen.entries()].map(([id, title]) => ({ id, title }))
    }, [envelopes])

    const needle = query.trim().toLowerCase()
    const since = period.days ? Date.now() - period.days * 24 * 60 * 60 * 1000 : null
    const base = envelopes.filter(
        (envelope) =>
            (!template || envelope.templateId === template) &&
            (!since || new Date(envelope.sentAt ?? envelope.createdAt).getTime() >= since) &&
            (!needle ||
                `${envelope.signer.name} ${envelope.title} ${envelope.verificationCode}`
                    .toLowerCase()
                    .includes(needle)),
    )

    return {
        status,
        period,
        template,
        query,
        templates,
        set,
        counts: Object.fromEntries(
            STATUS_FILTERS.map((item) => [item.value, base.filter(item.match).length]),
        ),
        rows: base.filter(status.match),
        active: status.value !== 'todos' || period.value !== 'todos' || Boolean(template) || Boolean(needle),
        clear: () => setParams({}, { replace: true }),
    }
}

export function EnvelopeTable({ limit, filterable }: { limit?: number; filterable?: boolean } = {}) {
    const { data, error, loading, reload, live } = useEnvelopes()
    const filters = useFilters(data ?? [])
    const office = useOffice()
    const partnerInbox = partnerLink(office, '/atendimento')

    if (loading && !data) {
        return (
            <div className="overflow-hidden rounded-2xl border border-line">
                {Array.from({ length: 5 }).map((_, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-6 border-b border-line px-5 py-4 last:border-0"
                    >
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-1/5" />
                        <Skeleton className="ml-auto h-5 w-20 rounded-full" />
                    </div>
                ))}
            </div>
        )
    }

    if (error && !data) {
        return (
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

    if (!data?.length) {
        return (
            <EmptyState
                icon={<FileSignature />}
                title="Nenhum documento ainda"
                description={`Os contratos enviados pelas conversas da ${office.partner.name} aparecem aqui, com o andamento ao vivo.`}
                action={
                    <div className="flex flex-wrap justify-center gap-2">
                        {partnerInbox ? (
                            <Button asChild variant="secondary">
                                <a href={partnerInbox}>Ir para a {office.partner.name}</a>
                            </Button>
                        ) : null}
                        <Button asChild variant="ghost">
                            <Link to="/painel/enviar">Envio avulso</Link>
                        </Button>
                    </div>
                }
            />
        )
    }

    const visible = filterable ? filters.rows : data
    const rows = limit ? visible.slice(0, limit) : visible

    return (
        <div className="space-y-3">
            <p className="flex items-center gap-2 text-xs text-muted">
                <span
                    className={
                        live ? 'size-1.5 rounded-full bg-emerald-500' : 'size-1.5 rounded-full bg-line-strong'
                    }
                    aria-hidden
                />
                {live ? 'Atualizando ao vivo' : 'Atualizando a cada poucos segundos'}
            </p>

            {filterable ? <FilterBar filters={filters} /> : null}

            {!rows.length ? (
                <div className="rounded-2xl border border-line px-5 py-12 text-center">
                    <p className="text-sm text-muted">Nenhum documento com esses filtros.</p>
                    <Button variant="ghost" size="sm" className="mt-3" onClick={filters.clear}>
                        Limpar filtros
                    </Button>
                </div>
            ) : null}

            <div
                className={cn(
                    'hidden overflow-hidden rounded-2xl border border-line',
                    rows.length && 'md:block',
                )}
            >
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-line bg-surface/70">
                        <tr className="text-[11px] font-semibold uppercase tracking-[0.12em] text-subtle">
                            <th className="px-5 py-3 font-semibold">Documento</th>
                            <th className="px-5 py-3 font-semibold">Signatário</th>
                            <th className="px-5 py-3 font-semibold">Status</th>
                            <th className="px-5 py-3 text-right font-semibold">Enviado</th>
                            <th className="px-5 py-3 text-right font-semibold">Concluído</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((envelope) => (
                            <tr
                                key={envelope.id}
                                className="group border-b border-line transition-colors last:border-0 hover:bg-surface/60"
                            >
                                <td className="px-5 py-4">
                                    <Link
                                        to={`/painel/envelopes/${envelope.id}`}
                                        className="font-medium text-ink underline-offset-4 group-hover:underline"
                                    >
                                        {envelope.title}
                                    </Link>
                                </td>
                                <td className="px-5 py-4">
                                    <p className="text-ink">{envelope.signer.name}</p>
                                    <p className="text-xs text-subtle tabular">{envelope.signer.cpfMasked}</p>
                                </td>
                                <td className="px-5 py-4">
                                    <StatusPill status={envelope.status} />
                                </td>
                                <td className="px-5 py-4 text-right text-muted tabular">
                                    {formatDateTime(envelope.sentAt ?? envelope.createdAt)}
                                </td>
                                <td className="px-5 py-4 text-right text-muted tabular">
                                    {envelope.completedAt ? formatDateTime(envelope.completedAt) : '·'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <ul
                className={cn(
                    'divide-y divide-line overflow-hidden rounded-2xl border border-line md:hidden',
                    !rows.length && 'hidden',
                )}
            >
                {rows.map((envelope) => (
                    <li key={envelope.id}>
                        <Link
                            to={`/painel/envelopes/${envelope.id}`}
                            className="flex items-start justify-between gap-3 px-4 py-4 active:bg-surface"
                        >
                            <div className="min-w-0">
                                <p className="truncate font-medium">{envelope.title}</p>
                                <p className="mt-0.5 text-sm text-muted">{envelope.signer.name}</p>
                                <p className="mt-1 text-xs text-subtle tabular">
                                    {formatDateTime(envelope.sentAt ?? envelope.createdAt)}
                                </p>
                            </div>
                            <StatusPill status={envelope.status} />
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    )
}

function FilterBar({ filters }: { filters: ReturnType<typeof useFilters> }) {
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por status">
                {STATUS_FILTERS.map((item) => {
                    const selected = item.value === filters.status.value
                    return (
                        <button
                            key={item.value}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => filters.set('status', item.value)}
                            className={cn(
                                'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors',
                                selected
                                    ? 'border-ink bg-ink text-white'
                                    : 'border-line bg-white text-ink/80 hover:bg-surface',
                            )}
                        >
                            {item.label}
                            <span
                                className={cn('text-xs tabular', selected ? 'text-white/70' : 'text-subtle')}
                            >
                                {filters.counts[item.value]}
                            </span>
                        </button>
                    )
                })}
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_200px_180px]">
                <label className="flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-3">
                    <Search className="size-4 text-subtle" aria-hidden />
                    <span className="sr-only">Buscar</span>
                    <input
                        value={filters.query}
                        onChange={(event) => filters.set('q', event.target.value)}
                        placeholder="Buscar por cliente, documento ou código"
                        className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
                    />
                </label>
                <NativeSelect
                    aria-label="Modelo"
                    value={filters.template}
                    onChange={(event) => filters.set('modelo', event.target.value)}
                >
                    <option value="">Todos os modelos</option>
                    {filters.templates.map((item) => (
                        <option key={item.id} value={item.id}>
                            {item.title}
                        </option>
                    ))}
                </NativeSelect>
                <NativeSelect
                    aria-label="Período"
                    value={filters.period.value}
                    onChange={(event) => filters.set('periodo', event.target.value)}
                >
                    {PERIODS.map((item) => (
                        <option key={item.value} value={item.value}>
                            {item.label}
                        </option>
                    ))}
                </NativeSelect>
            </div>
        </div>
    )
}
