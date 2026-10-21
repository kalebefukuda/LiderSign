import { ArrowUpRight, BookOpen, Search } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { Button, LogoMark, cn, errorMessage, useDocumentTitle } from '@lidersign/ui'

import { PageHeader } from '@/components/page-header'
import { ZapSignDialog } from '@/components/zapsign-dialog'
import { hubApi, openLiderSign } from '@/lib/api'
import { useHostStatus } from '@/lib/status'

type IntegrationId = 'advbox' | 'lidersign' | 'zapsign' | 'clicksign' | 'docusign' | 'autentique'

type Integration = {
    id: IntegrationId
    name: string
    category: string
    description: string
    tag?: string
    available: boolean
}

const INTEGRATIONS: Integration[] = [
    {
        id: 'advbox',
        name: 'ADVBox',
        category: 'Jurídico',
        description: 'Processos, prazos e clientes sincronizados com o atendimento.',
        available: false,
    },
    {
        id: 'lidersign',
        name: 'LíderSign',
        category: 'Assinaturas & Documentos',
        description: 'O cliente assina o contrato pelo WhatsApp. Ativa em um clique, sem conta e sem token.',
        tag: 'Novo',
        available: true,
    },
    {
        id: 'zapsign',
        name: 'ZapSign',
        category: 'Assinaturas & Documentos',
        description: 'Documentos para assinar a partir dos modelos da sua conta ZapSign.',
        available: true,
    },
    {
        id: 'clicksign',
        name: 'Clicksign',
        category: 'Assinaturas & Documentos',
        description: 'Envio de documentos para assinatura eletrônica.',
        available: false,
    },
    {
        id: 'docusign',
        name: 'Docusign',
        category: 'Assinaturas & Documentos',
        description: 'Envio de documentos para assinatura eletrônica.',
        available: false,
    },
    {
        id: 'autentique',
        name: 'Autentique',
        category: 'Assinaturas & Documentos',
        description: 'Envio de documentos para assinatura eletrônica.',
        available: false,
    },
]

const CATEGORIES = ['Jurídico', 'Assinaturas & Documentos']

type Tab = 'todas' | 'conectadas'

export function IntegrationsPage() {
    useDocumentTitle('Integrações')
    const { active, reload } = useHostStatus()
    const [tab, setTab] = React.useState<Tab>('todas')
    const [query, setQuery] = React.useState('')
    const [busy, setBusy] = React.useState<'activate' | 'deactivate' | null>(null)
    const [zapOpen, setZapOpen] = React.useState(false)

    const connected = (item: Integration) => item.id === 'lidersign' && active
    const needle = query.trim().toLowerCase()
    const visible = INTEGRATIONS.filter(
        (item) =>
            (tab === 'todas' || connected(item)) &&
            `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(needle),
    )

    async function activate() {
        setBusy('activate')
        try {
            await hubApi.activate()
            await reload()
            toast.success('LíderSign ativo. Já dá para enviar contratos pelas conversas.')
        } catch (error) {
            toast.error(errorMessage(error))
        } finally {
            setBusy(null)
        }
    }

    async function deactivate() {
        setBusy('deactivate')
        try {
            await hubApi.deactivate()
            await reload()
            toast('LíderSign desativado. Os contratos enviados continuam guardados.')
        } catch (error) {
            toast.error(errorMessage(error))
        } finally {
            setBusy(null)
        }
    }

    return (
        <div className="space-y-6">
            <PageHeader
                title="Integrações"
                description="Conecte o escritório aos serviços que ele já usa."
                action={
                    <Button asChild variant="secondary" size="sm">
                        <Link to="/docs">
                            <BookOpen aria-hidden /> Docs
                        </Link>
                    </Button>
                }
            />

            <div className="flex flex-col gap-3 border-b border-line sm:flex-row sm:items-end sm:justify-between">
                <div role="tablist" aria-label="Filtrar integrações" className="flex gap-6">
                    {(
                        [
                            { value: 'todas', label: 'Todas', count: INTEGRATIONS.length },
                            {
                                value: 'conectadas',
                                label: 'Conectadas',
                                count: INTEGRATIONS.filter(connected).length,
                            },
                        ] as const
                    ).map((item) => (
                        <button
                            key={item.value}
                            role="tab"
                            type="button"
                            aria-selected={tab === item.value}
                            onClick={() => setTab(item.value)}
                            className={cn(
                                '-mb-px inline-flex items-center gap-2 border-b-2 pb-3 text-sm font-medium transition-colors',
                                tab === item.value
                                    ? 'border-ink text-ink'
                                    : 'border-transparent text-muted hover:text-ink',
                            )}
                        >
                            {item.label}
                            <span className="text-xs text-subtle tabular">{item.count}</span>
                        </button>
                    ))}
                </div>
                <label className="mb-3 flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 sm:w-72">
                    <Search className="size-4 text-subtle" aria-hidden />
                    <span className="sr-only">Buscar integração</span>
                    <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Buscar integração"
                        className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
                    />
                </label>
            </div>

            {!visible.length ? (
                <p className="rounded-xl border border-line bg-white px-5 py-12 text-center text-sm text-muted">
                    {tab === 'conectadas' && !query
                        ? 'Nenhuma integração conectada ainda.'
                        : 'Nenhuma integração com esse nome.'}
                </p>
            ) : (
                <div className="space-y-8">
                    {CATEGORIES.map((category) => {
                        const items = visible.filter((item) => item.category === category)
                        if (!items.length) return null
                        return (
                            <section key={category} aria-label={category} className="space-y-3">
                                <h2 className="text-sm font-medium text-muted">{category}</h2>
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    {items.map((item) => (
                                        <IntegrationCard key={item.id} item={item}>
                                            {item.id === 'lidersign' ? (
                                                active ? (
                                                    <>
                                                        <ConnectedLabel />
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                loading={busy === 'deactivate'}
                                                                onClick={() => void deactivate()}
                                                            >
                                                                Desativar
                                                            </Button>
                                                            <Button asChild variant="secondary" size="sm">
                                                                <a
                                                                    href={openLiderSign('/painel')}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                >
                                                                    Abrir <ArrowUpRight aria-hidden />
                                                                </a>
                                                            </Button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="text-xs text-muted">Sem token</span>
                                                        <Button
                                                            size="sm"
                                                            loading={busy === 'activate'}
                                                            onClick={() => void activate()}
                                                        >
                                                            Ativar
                                                        </Button>
                                                    </>
                                                )
                                            ) : item.id === 'zapsign' ? (
                                                <>
                                                    <span className="text-xs text-muted">Token de API</span>
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => setZapOpen(true)}
                                                    >
                                                        Conectar
                                                    </Button>
                                                </>
                                            ) : (
                                                <span className="text-xs font-medium text-subtle">
                                                    Em breve
                                                </span>
                                            )}
                                        </IntegrationCard>
                                    ))}
                                </div>
                            </section>
                        )
                    })}
                </div>
            )}

            <ZapSignDialog open={zapOpen} onOpenChange={setZapOpen} />
        </div>
    )
}

function IntegrationCard({ item, children }: { item: Integration; children: React.ReactNode }) {
    return (
        <article
            aria-label={item.name}
            className={cn(
                'flex min-h-[148px] flex-col rounded-xl border border-line bg-white p-4',
                !item.available && 'bg-white/60',
            )}
        >
            <div className="flex items-start gap-3">
                {item.id === 'lidersign' ? (
                    <LogoMark className="size-9 shrink-0" />
                ) : (
                    <span
                        aria-hidden
                        className={cn(
                            'flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-sm font-semibold',
                            item.available ? 'text-ink' : 'text-subtle',
                        )}
                    >
                        {item.name[0]}
                    </span>
                )}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className={cn('text-sm font-semibold', !item.available && 'text-ink/60')}>
                            {item.name}
                        </h3>
                        {item.tag ? (
                            <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                                {item.tag}
                            </span>
                        ) : null}
                    </div>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted">{item.description}</p>
                </div>
            </div>
            <div className="mt-auto flex items-center justify-between gap-2 pt-4">{children}</div>
        </article>
    )
}

function ConnectedLabel() {
    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden /> Conectado
        </span>
    )
}
