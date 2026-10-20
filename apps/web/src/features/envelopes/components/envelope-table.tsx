import { FileSignature, RefreshCw } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/primitives'
import { EmptyState, ErrorNotice } from '@/components/ui/states'
import { formatDateTime } from '@/lib/format'

import { useEnvelopes } from '../hooks'
import { StatusPill } from './status-pill'

export function EnvelopeTable() {
    const { data, error, loading, reload, live } = useEnvelopes()

    if (loading && !data) {
        return (
            <div className="overflow-hidden rounded-2xl border border-line">
                {Array.from({ length: 5 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-6 border-b border-line px-5 py-4 last:border-0">
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
                title="Nenhum documento enviado ainda"
                description="Gere um contrato a partir da conversa com o lead e ele aparece aqui, com o andamento ao vivo."
                action={
                    <Button asChild>
                        <Link to="/demo">Enviar o primeiro contrato</Link>
                    </Button>
                }
            />
        )
    }

    return (
        <div className="space-y-3">
            <p className="flex items-center gap-2 text-xs text-muted">
                <span
                    className={live ? 'size-1.5 rounded-full bg-emerald-500' : 'size-1.5 rounded-full bg-line-strong'}
                    aria-hidden
                />
                {live ? 'Atualizando ao vivo' : 'Atualizando a cada poucos segundos'}
            </p>

            <div className="hidden overflow-hidden rounded-2xl border border-line md:block">
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
                        {data.map((envelope) => (
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

            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line md:hidden">
                {data.map((envelope) => (
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
