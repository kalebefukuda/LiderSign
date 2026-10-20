import { Check, ChevronDown, ExternalLink, Loader2 } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { LogoMark } from '@/features/brand'
import { CallLog, demoApi, ZapSignDialog, type DemoStatus } from '@/features/demo'
import { errorMessage } from '@/lib/http'

import { PageHeader } from './page-header'

/** Tela de Integrações da LíderHub: o LíderSign liga com um clique, ao lado da ZapSign que pede token. */
export function IntegrationsTab({
    status,
    onChanged,
}: {
    status: DemoStatus | undefined
    onChanged: () => void
}) {
    const [busy, setBusy] = React.useState(false)
    const [zapOpen, setZapOpen] = React.useState(false)
    const active = Boolean(status?.active)

    async function toggle(next: boolean) {
        setBusy(true)
        try {
            if (next) {
                await demoApi.activate()
                toast.success('LíderSign ativo. Já dá para enviar contratos pelas conversas.')
            } else {
                await demoApi.deactivate()
                toast('LíderSign desativado')
            }
            onChanged()
        } catch (error) {
            toast.error(errorMessage(error))
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="space-y-8">
            <PageHeader title="Integrações" description="Conecte as ferramentas que o seu escritório usa." />

            <div className="grid gap-4 lg:grid-cols-2">
                <article className="rounded-xl border-2 border-brand/30 bg-white p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                        <LogoMark className="size-11 shrink-0" />
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-lg font-semibold">LíderSign</h2>
                                {active ? (
                                    <Badge tone="success" dot>
                                        Ativo
                                    </Badge>
                                ) : (
                                    <Badge tone="brand">Novo</Badge>
                                )}
                            </div>
                            <p className="mt-1 text-sm leading-relaxed text-muted">
                                Contratos e procurações assinados pelo WhatsApp, sem sair da conversa.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                            {busy ? <Loader2 className="size-4 animate-spin text-muted" aria-hidden /> : null}
                            <Switch
                                aria-label="Ativar LíderSign"
                                checked={active}
                                disabled={busy || !status}
                                onCheckedChange={(next) => void toggle(next)}
                            />
                        </div>
                    </div>
                    <ul className="mt-5 space-y-2 border-t border-line pt-4 text-sm text-ink/80">
                        {[
                            'Sem criar conta e sem token: é só ativar',
                            'Já vem com modelos de contrato de honorários e procuração',
                            'O contrato sai pela conversa e o status volta para cá',
                        ].map((text) => (
                            <li key={text} className="flex gap-2">
                                <Check className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /> {text}
                            </li>
                        ))}
                    </ul>
                    {active ? (
                        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                            <Link
                                to="/painel"
                                className="inline-flex items-center gap-1 font-medium text-brand hover:underline"
                            >
                                Abrir o LíderSign <ExternalLink className="size-3.5" aria-hidden />
                            </Link>
                            <span className="text-muted">Modelos, documentos e PDFs assinados</span>
                        </div>
                    ) : null}
                </article>

                <article className="rounded-xl border border-line bg-white p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface text-sm font-bold text-muted">
                            ZS
                        </span>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-lg font-semibold">ZapSign</h2>
                            <p className="mt-1 text-sm leading-relaxed text-muted">
                                Assinatura eletrônica. Precisa de conta na ZapSign, plano com API e token.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setZapOpen(true)}
                            className="shrink-0 rounded-lg border border-line-strong px-3 py-1.5 text-sm font-medium hover:bg-surface"
                        >
                            Conectar
                        </button>
                    </div>
                </article>
            </div>

            <section className="rounded-xl border border-line bg-surface/50 p-5 sm:p-6">
                <h2 className="text-sm font-semibold">O que o switch faz</h2>
                <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink/80">
                    A LíderHub chama o LíderSign com a chave de parceiro dela, guardada no servidor, e envia
                    só três coisas: o identificador do escritório, o nome e o endereço para receber os avisos.
                    O LíderSign cria a conta com os modelos de exemplo. Dados de clientes só vão quando um
                    contrato é enviado, um por vez.
                </p>
            </section>

            <details className="group rounded-xl border border-line" open>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
                    Chamadas entre a LíderHub e o LíderSign, ao vivo
                    <ChevronDown
                        className="size-4 text-muted transition-transform group-open:rotate-180"
                        aria-hidden
                    />
                </summary>
                <div className="border-t border-line p-4">
                    <CallLog />
                </div>
            </details>

            <ZapSignDialog open={zapOpen} onOpenChange={setZapOpen} />
        </div>
    )
}
