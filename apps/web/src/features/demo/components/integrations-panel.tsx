import { Check, Loader2, MousePointerClick } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Kicker } from '@/components/ui/primitives'
import { Switch } from '@/components/ui/switch'
import { LogoMark } from '@/features/brand'
import { cn } from '@/lib/cn'
import { errorMessage } from '@/lib/http'

import { demoApi, type DemoStatus } from '../api'
import { ZapSignDialog } from './zapsign-dialog'

const CAPABILITIES = ['Listar modelos', 'Ver campos do modelo', 'Criar documento para assinar', 'Ver status do documento']

const ZAPSIGN_STEPS = [
    'Criar conta no ZapSign',
    'Assinar o plano Equipe ou Enterprise',
    'Achar o token em Configurações › Integrações',
    'Copiar e colar o token na LíderHub',
    'Escolher o ambiente e testar',
]

export function IntegrationsPanel({
    status,
    onChanged,
    onNext,
}: {
    status: DemoStatus | undefined
    onChanged: () => Promise<void>
    onNext: () => void
}) {
    const [zapOpen, setZapOpen] = React.useState(false)
    const [busy, setBusy] = React.useState(false)
    const active = Boolean(status?.active)

    async function toggle(next: boolean) {
        setBusy(true)
        try {
            if (next) {
                const result = await demoApi.activate()
                toast.success(result.created ? 'LíderSign ativo. Modelos de exemplo prontos.' : 'LíderSign ativo de novo.')
            } else if (status?.tenant) {
                await demoApi.deactivate(status.tenant.externalId)
                toast('LíderSign desativado neste escritório.')
            }
            await onChanged()
        } catch (error) {
            toast.error(errorMessage(error))
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="space-y-10">
            <div>
                <h2 className="text-2xl font-bold tracking-[-0.03em]">Integrações</h2>
                <p className="mt-1 text-[15px] text-muted">Gerencie as integrações disponíveis para seus agentes.</p>
            </div>

            <section aria-labelledby="assinatura">
                <Kicker id="assinatura">Assinatura eletrônica</Kicker>
                <ul className="mt-3 divide-y divide-line overflow-hidden rounded-2xl border border-line">
                    <li
                        className={cn(
                            'relative px-5 py-5 transition-colors duration-200',
                            active ? 'bg-brand-soft/50' : 'bg-white',
                        )}
                    >
                        <div className="flex items-start gap-4">
                            <LogoMark className="size-10 shrink-0" />
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold tracking-[-0.01em]">LíderSign</p>
                                    <Badge tone="brand">Nativo</Badge>
                                    {active ? (
                                        <Badge tone="success" dot>
                                            Ativo
                                        </Badge>
                                    ) : null}
                                </div>
                                <p className="mt-1 text-sm leading-relaxed text-muted">
                                    Assinador da própria LíderHub. Sem token, sem conta externa, sem plano por escritório.
                                </p>
                            </div>
                            <div className="flex items-center gap-3 pt-1">
                                {busy ? <Loader2 className="size-4 animate-spin text-muted" aria-hidden /> : null}
                                <label htmlFor="lidersign-switch" className="sr-only">
                                    Ativar LíderSign
                                </label>
                                <Switch
                                    id="lidersign-switch"
                                    checked={active}
                                    disabled={busy || !status}
                                    onCheckedChange={(next) => void toggle(next)}
                                />
                            </div>
                        </div>

                        {active ? (
                            <div className="mt-5 grid gap-5 border-t border-brand/10 pt-5 sm:grid-cols-[1fr_auto] sm:items-end animate-enter">
                                <div>
                                    <p className="text-sm text-ink">
                                        <span className="font-semibold tabular">{status?.templatesCount ?? 0} modelos</span>{' '}
                                        prontos para usar
                                    </p>
                                    <p className="mt-3 text-[13px] text-muted">
                                        Disponível agora para os agentes e o Assistente (MCP):
                                    </p>
                                    <ul className="mt-2 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                                        {CAPABILITIES.map((item) => (
                                            <li key={item} className="flex items-center gap-2 text-[13px] text-ink/80">
                                                <Check className="size-3.5 shrink-0 text-brand" aria-hidden />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <Button size="sm" onClick={onNext}>
                                    Enviar um contrato
                                </Button>
                            </div>
                        ) : (
                            <p className="mt-4 flex items-center gap-2 text-[13px] font-medium text-brand">
                                <MousePointerClick className="size-4" aria-hidden /> Um clique no botão ao lado e o
                                escritório já pode enviar contratos.
                            </p>
                        )}
                    </li>

                    <li className="flex flex-wrap items-start gap-4 px-5 py-5">
                        <span
                            aria-hidden
                            className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-line bg-surface text-sm font-semibold text-muted"
                        >
                            Z
                        </span>
                        <div className="min-w-[200px] flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold tracking-[-0.01em]">ZapSign</p>
                                <Badge tone="warning">Requer token</Badge>
                            </div>
                            <p className="mt-1 text-sm leading-relaxed text-muted">
                                Plataforma externa. Cada escritório precisa de conta, token de API e plano pago.
                            </p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => setZapOpen(true)}>
                            Conectar
                        </Button>
                    </li>

                    <li className="flex flex-wrap items-start gap-4 px-5 py-5 opacity-70">
                        <span
                            aria-hidden
                            className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-dashed border-line-strong text-sm text-subtle"
                        >
                            +3
                        </span>
                        <div className="min-w-[200px] flex-1">
                            <p className="font-semibold tracking-[-0.01em]">Clicksign, Autentique, DocuSign</p>
                            <p className="mt-1 text-sm leading-relaxed text-muted">
                                Mesmo modelo: token e plano próprios em cada assinador.
                            </p>
                        </div>
                        <Badge>Em breve</Badge>
                    </li>
                </ul>
            </section>

            <section aria-labelledby="comparativo">
                <Kicker id="comparativo">Antes e depois</Kicker>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-line p-5">
                        <p className="text-sm text-muted">Conectar a ZapSign</p>
                        <p className="mt-1 text-2xl font-bold tracking-[-0.03em] tabular">5 passos</p>
                        <p className="text-[13px] text-subtle">fora da LíderHub, com plano pago por escritório</p>
                        <ol className="mt-4 space-y-2">
                            {ZAPSIGN_STEPS.map((step, index) => (
                                <li key={step} className="flex gap-3 text-sm text-ink/80">
                                    <span className="w-4 shrink-0 font-mono text-xs leading-5 text-subtle tabular">
                                        {index + 1}
                                    </span>
                                    {step}
                                </li>
                            ))}
                        </ol>
                    </div>
                    <div className="rounded-2xl border border-brand/25 bg-brand-soft/40 p-5">
                        <p className="text-sm text-muted">Ativar o LíderSign</p>
                        <p className="mt-1 text-2xl font-bold tracking-[-0.03em] text-brand tabular">1 clique</p>
                        <p className="text-[13px] text-subtle">dentro da LíderHub, sem token</p>
                        <ol className="mt-4 space-y-2">
                            <li className="flex gap-3 text-sm text-ink/80">
                                <span className="w-4 shrink-0 font-mono text-xs leading-5 text-subtle tabular">1</span>
                                Ligar o LíderSign em Integrações
                            </li>
                        </ol>
                        <p className="mt-4 text-[13px] leading-relaxed text-muted">
                            A LíderHub cria a conta do escritório com uma chave de parceiro guardada no servidor. O
                            advogado nunca vê token.
                        </p>
                    </div>
                </div>
            </section>

            <ZapSignDialog open={zapOpen} onOpenChange={setZapOpen} />
        </div>
    )
}
