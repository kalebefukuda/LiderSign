import type { EnvelopeDto } from '@lidersign/shared'
import { ArrowRight, ArrowUpRight, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router'

import { formatDateTime, useDocumentTitle, useResource } from '@lidersign/ui'

import { EnvelopeTable, useEnvelopes } from '@/features/envelopes'
import { demoApi, type DemoStatus } from '@/features/demo'

function count(envelopes: EnvelopeDto[] | undefined, statuses: string[]) {
    return envelopes?.filter((envelope) => statuses.includes(envelope.status)).length ?? 0
}

export default function HomeRoute() {
    useDocumentTitle('Início · LíderSign')
    const status = useResource<DemoStatus>(demoApi.statusUrl)
    const { data } = useEnvelopes()
    const connectedAt = status.data?.tenant?.createdAt

    const stats = [
        { label: 'Aguardando assinatura', value: count(data, ['SENT', 'VIEWED']), href: '/painel/envelopes' },
        { label: 'Assinados', value: count(data, ['SIGNED', 'COMPLETED']), href: '/painel/envelopes' },
        { label: 'Modelos de contrato', value: status.data?.templatesCount ?? 0, href: '/painel/modelos' },
    ]

    return (
        <div className="space-y-10 animate-enter">
            <div>
                <h1 className="text-[28px] font-bold tracking-[-0.03em]">Início</h1>
                <p className="mt-1.5 max-w-[62ch] text-muted">
                    Os contratos saem pelas conversas da LíderHub. Aqui você acompanha os documentos, baixa os
                    PDFs assinados e cuida dos modelos.
                </p>
            </div>

            <section className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
                    <div>
                        <p className="font-semibold">Conectado à LíderHub</p>
                        <p className="mt-0.5 text-sm text-ink/75">
                            {connectedAt ? `Desde ${formatDateTime(connectedAt)}. ` : ''}Sem token: a LíderHub
                            cuida da conexão.
                        </p>
                    </div>
                </div>
                <Link
                    to="/liderhub?aba=conversas"
                    className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:underline"
                >
                    Enviar um contrato pela LíderHub <ArrowUpRight className="size-4" aria-hidden />
                </Link>
            </section>

            <div className="grid gap-4 sm:grid-cols-3">
                {stats.map((stat) => (
                    <Link
                        key={stat.label}
                        to={stat.href}
                        className="rounded-2xl border border-line p-5 transition-colors hover:bg-surface/60"
                    >
                        <p className="text-sm text-muted">{stat.label}</p>
                        <p className="mt-2 text-[32px] font-bold leading-none tracking-[-0.03em] tabular">
                            {stat.value}
                        </p>
                    </Link>
                ))}
            </div>

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
        </div>
    )
}
