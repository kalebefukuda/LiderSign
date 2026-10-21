import type { EnvelopeDto } from '@lidersign/shared'
import { Download, ExternalLink, FileSignature, FileText, MessagesSquare, Search } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/primitives'
import { EmptyState } from '@/components/ui/states'
import { envelopesApi, StatusPill, useEnvelopes } from '@/features/envelopes'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/format'

import { PageHeader, Tabs } from './page-header'

type Tab = 'documentos' | 'modelos'
type Filter = 'todos' | 'aguardando' | 'assinados' | 'encerrados'

const FILTERS: { value: Filter; label: string; match: (envelope: EnvelopeDto) => boolean }[] = [
    { value: 'todos', label: 'Todos', match: () => true },
    {
        value: 'aguardando',
        label: 'Aguardando assinatura',
        match: (e) => e.status === 'SENT' || e.status === 'VIEWED',
    },
    {
        value: 'assinados',
        label: 'Assinados',
        match: (e) => e.status === 'SIGNED' || e.status === 'COMPLETED',
    },
    {
        value: 'encerrados',
        label: 'Cancelados ou expirados',
        match: (e) => e.status === 'CANCELED' || e.status === 'EXPIRED',
    },
]

export function ContractsPage({
    active,
    onOpenIntegrations,
    onOpenInbox,
}: {
    active: boolean
    onOpenIntegrations: () => void
    onOpenInbox: () => void
}) {
    const [tab, setTab] = React.useState<Tab>('documentos')

    return (
        <div className="space-y-6">
            <PageHeader
                title="Contratos"
                description="Os contratos enviados para assinatura e os seus modelos, sem sair da LíderHub."
                action={
                    active ? (
                        <Button asChild variant="secondary" size="sm">
                            <a href="/painel" target="_blank" rel="noreferrer">
                                Abrir o LíderSign <ExternalLink aria-hidden />
                            </a>
                        </Button>
                    ) : null
                }
            />

            {!active ? (
                <EmptyState
                    icon={<FileSignature />}
                    title="Ative o LíderSign para ver os contratos aqui"
                    description="É um clique em Integrações: sem conta e sem token."
                    action={<Button onClick={onOpenIntegrations}>Ir para Integrações</Button>}
                />
            ) : (
                <>
                    <Tabs
                        value={tab}
                        onChange={setTab}
                        items={[
                            { value: 'documentos', label: 'Documentos', icon: FileSignature },
                            { value: 'modelos', label: 'Modelos', icon: FileText },
                        ]}
                    />
                    {tab === 'documentos' ? (
                        <Documents onOpenInbox={onOpenInbox} />
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-muted">
                                Suba o seu contrato (Word ou PDF) e a IA marca os campos. O agente preenche
                                com os dados da conversa.
                            </p>
                            <iframe
                                title="Modelos do LíderSign"
                                src="/painel/modelos"
                                className="h-[calc(100dvh-300px)] min-h-[560px] w-full rounded-xl border border-line bg-white"
                            />
                        </div>
                    )}
                </>
            )}
        </div>
    )
}

function Documents({ onOpenInbox }: { onOpenInbox: () => void }) {
    const { data, loading } = useEnvelopes()
    const [filter, setFilter] = React.useState<Filter>('todos')
    const [query, setQuery] = React.useState('')

    if (loading && !data) return <Skeleton className="h-64 w-full rounded-xl" />

    const all = data ?? []
    const current = FILTERS.find((item) => item.value === filter) ?? FILTERS[0]
    const needle = query.trim().toLowerCase()
    const rows = all.filter(
        (envelope) => current.match(envelope) && envelope.signer.name.toLowerCase().includes(needle),
    )

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por status">
                    {FILTERS.map((item) => {
                        const count = all.filter(item.match).length
                        const selected = item.value === filter
                        return (
                            <button
                                key={item.value}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => setFilter(item.value)}
                                className={cn(
                                    'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors',
                                    selected
                                        ? 'border-ink bg-ink text-white'
                                        : 'border-line bg-white text-ink/80 hover:bg-surface',
                                )}
                            >
                                {item.label}
                                <span
                                    className={cn(
                                        'text-xs tabular',
                                        selected ? 'text-white/70' : 'text-subtle',
                                    )}
                                >
                                    {count}
                                </span>
                            </button>
                        )
                    })}
                </div>
                <label className="flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 lg:w-72">
                    <Search className="size-4 text-subtle" aria-hidden />
                    <span className="sr-only">Buscar por cliente</span>
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar por cliente"
                        className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
                    />
                </label>
            </div>

            {!all.length ? (
                <EmptyState
                    icon={<FileSignature />}
                    title="Nenhum contrato ainda"
                    description="Os contratos enviados pelas conversas aparecem aqui, com o andamento ao vivo."
                    action={
                        <Button variant="secondary" onClick={onOpenInbox}>
                            Ir para o Atendimento
                        </Button>
                    }
                />
            ) : !rows.length ? (
                <p className="rounded-xl border border-line bg-white px-5 py-10 text-center text-sm text-muted">
                    Nenhum contrato com esse filtro.
                </p>
            ) : (
                <div className="overflow-x-auto rounded-xl border border-line bg-white">
                    <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="border-b border-line text-xs text-muted">
                            <tr>
                                <th className="px-5 py-3 font-medium">Cliente</th>
                                <th className="px-5 py-3 font-medium">Modelo</th>
                                <th className="px-5 py-3 font-medium">Status</th>
                                <th className="px-5 py-3 font-medium">Enviado</th>
                                <th className="px-5 py-3 font-medium">Assinado</th>
                                <th className="px-5 py-3 text-right font-medium">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((envelope) => (
                                <tr key={envelope.id} className="border-b border-line last:border-0">
                                    <td className="px-5 py-3.5">
                                        <p className="font-medium">{envelope.signer.name}</p>
                                        <p className="text-xs text-subtle tabular">
                                            {envelope.signer.cpfMasked}
                                        </p>
                                    </td>
                                    <td className="px-5 py-3.5 text-ink/80">{envelope.title}</td>
                                    <td className="px-5 py-3.5">
                                        <StatusPill status={envelope.status} />
                                    </td>
                                    <td className="px-5 py-3.5 text-muted tabular">
                                        {formatDateTime(envelope.sentAt ?? envelope.createdAt)}
                                    </td>
                                    <td className="px-5 py-3.5 text-muted tabular">
                                        {envelope.completedAt ? formatDateTime(envelope.completedAt) : '·'}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex justify-end gap-1">
                                            {envelope.status === 'COMPLETED' ? (
                                                <IconLink
                                                    href={envelopesApi.fileUrl(envelope.id, 'signed')}
                                                    label="Baixar PDF assinado"
                                                    download
                                                >
                                                    <Download className="size-4" />
                                                </IconLink>
                                            ) : null}
                                            {envelope.externalRef === 'lead-maria-aparecida-bpc' ? (
                                                <button
                                                    type="button"
                                                    onClick={onOpenInbox}
                                                    aria-label="Ver conversa"
                                                    title="Ver conversa"
                                                    className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink"
                                                >
                                                    <MessagesSquare className="size-4" />
                                                </button>
                                            ) : null}
                                            <IconLink
                                                href={`/painel/envelopes/${envelope.id}`}
                                                label="Detalhes e trilha de auditoria"
                                                external
                                            >
                                                <ExternalLink className="size-4" />
                                            </IconLink>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

function IconLink({
    href,
    label,
    download,
    external,
    children,
}: {
    href: string
    label: string
    download?: boolean
    external?: boolean
    children: React.ReactNode
}) {
    return (
        <a
            href={href}
            aria-label={label}
            title={label}
            download={download}
            target={external ? '_blank' : undefined}
            rel={external ? 'noreferrer' : undefined}
            className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-ink"
        >
            {children}
        </a>
    )
}
