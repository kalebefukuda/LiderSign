import { Bot, Loader2 } from 'lucide-react'
import * as React from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Kicker } from '@/components/ui/primitives'
import { CopyButton } from '@/components/ui/states'
import { Switch } from '@/components/ui/switch'
import { LogoMark } from '@/features/brand'
import { errorMessage } from '@/lib/http'
import { useResource } from '@/lib/use-resource'

import { demoApi, type DemoStatus } from '../api'
import { CallLog } from './call-log'
import { ZapSignDialog } from './zapsign-dialog'

const STEPS = [
    {
        title: 'Ativar',
        route: 'POST /v1/partner/tenants',
        text: 'Quando o escritório liga o LíderSign, a LíderHub cria a conta dele no LíderSign, já com modelos de contrato. Sem token, sem cadastro.',
    },
    {
        title: 'Enviar',
        route: 'POST /v1/envelopes',
        text: 'O agente da LíderHub manda o modelo e os dados do lead. O LíderSign gera o PDF e devolve o link, que segue pelo WhatsApp da própria LíderHub.',
    },
    {
        title: 'Acompanhar',
        route: 'webhooks',
        text: 'A cada etapa (enviado, aberto, assinado, concluído) o LíderSign avisa a LíderHub com assinatura HMAC, que prova que o aviso veio dele.',
    },
]

const MCP_TOOLS = ['Listar modelos', 'Ver campos do modelo', 'Criar documento para assinar', 'Ver status do documento']

const mcpCommand = (origin: string) => `claude mcp add lidersign \\
  -e LIDERSIGN_API_URL=${origin}/v1 \\
  -e PARTNER_API_KEY=<chave de parceiro do .env> \\
  -e LIDERSIGN_TENANT_ID=escritorio-demo \\
  -- node packages/agent/dist/mcp-stdio.js`

/** Como a LíderHub usa o LíderSign, com a ativação de verdade e o registro das chamadas. */
export function IntegrationPage() {
    const status = useResource<DemoStatus>(demoApi.statusUrl)
    const [busy, setBusy] = React.useState(false)
    const [zapOpen, setZapOpen] = React.useState(false)
    const active = Boolean(status.data?.active)
    const command = mcpCommand(window.location.origin)

    async function toggle(next: boolean) {
        setBusy(true)
        try {
            if (next) {
                const result = await demoApi.activate()
                toast.success(result.created ? 'Escritório criado no LíderSign, com os modelos de exemplo' : 'LíderSign reativado')
            } else {
                await demoApi.deactivate()
                toast('LíderSign desativado neste escritório')
            }
            await status.reload()
        } catch (error) {
            toast.error(errorMessage(error))
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="space-y-14 animate-enter">
            <div className="max-w-2xl">
                <h1 className="text-[28px] font-bold tracking-[-0.03em]">Integração com a LíderHub</h1>
                <p className="mt-2 text-[16px] leading-relaxed text-muted">
                    A LíderHub usa o LíderSign por API, com uma chave de parceiro guardada no servidor dela. O escritório
                    não cria conta nem cola token.
                </p>
            </div>

            <section aria-labelledby="como-funciona" className="space-y-4">
                <Kicker id="como-funciona">Como funciona</Kicker>
                <ol className="divide-y divide-line rounded-2xl border border-line">
                    {STEPS.map((step, index) => (
                        <li key={step.title} className="grid gap-2 px-5 py-5 sm:grid-cols-[40px_160px_1fr] sm:gap-4">
                            <span className="font-mono text-sm text-subtle tabular">0{index + 1}</span>
                            <span>
                                <span className="block font-semibold">{step.title}</span>
                                <span className="mt-0.5 block font-mono text-[12px] text-brand">{step.route}</span>
                            </span>
                            <span className="text-[15px] leading-relaxed text-ink/80">{step.text}</span>
                        </li>
                    ))}
                </ol>
            </section>

            <section aria-labelledby="experimente" className="space-y-4">
                <Kicker id="experimente">Experimente o passo 1</Kicker>
                <div className="rounded-2xl border border-line p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                        <LogoMark className="size-10 shrink-0" />
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <label htmlFor="lidersign-switch" className="font-semibold">
                                    Ativar LíderSign
                                </label>
                                {active ? (
                                    <Badge tone="success" dot>
                                        Ativo
                                    </Badge>
                                ) : (
                                    <Badge>Desligado</Badge>
                                )}
                            </div>
                            <p className="mt-1 text-sm leading-relaxed text-muted">
                                É o switch que o escritório vê dentro da LíderHub. Ligar faz o passo 1 de verdade: a chamada
                                aparece no registro abaixo.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 pt-1">
                            {busy ? <Loader2 className="size-4 animate-spin text-muted" aria-hidden /> : null}
                            <Switch
                                id="lidersign-switch"
                                checked={active}
                                disabled={busy || !status.data}
                                onCheckedChange={(next) => void toggle(next)}
                            />
                        </div>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-line pt-4 text-sm">
                        <button type="button" onClick={() => setZapOpen(true)} className="font-medium text-brand hover:underline">
                            Ver como é hoje com a ZapSign
                        </button>
                        {active ? (
                            <Link to="/painel/enviar" className="font-medium text-brand hover:underline">
                                Enviar um documento (passo 2)
                            </Link>
                        ) : null}
                    </div>
                </div>
            </section>

            <section aria-labelledby="registro" className="space-y-4">
                <div className="flex items-baseline justify-between gap-4">
                    <Kicker id="registro">Registro da integração</Kicker>
                    <span className="text-xs text-subtle">ao vivo</span>
                </div>
                <CallLog />
            </section>

            <section aria-labelledby="mcp" className="space-y-4">
                <Kicker id="mcp">Para os agentes de IA (MCP)</Kicker>
                <div className="rounded-2xl border border-line p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                        <Bot className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
                        <p className="text-[15px] leading-relaxed text-ink/85">
                            O Assistente e os agentes da LíderHub usam as mesmas operações como ferramentas:{' '}
                            {MCP_TOOLS.join(' · ')}.
                        </p>
                    </div>
                    <div className="mt-4 flex items-start justify-between gap-3 rounded-xl bg-ink p-4">
                        <pre className="overflow-x-auto font-mono text-[12px] leading-relaxed text-white/90">{command}</pre>
                        <CopyButton
                            value={command}
                            label="Copiar comando"
                            className="shrink-0 text-white/80 hover:bg-white/10 hover:text-white"
                        />
                    </div>
                </div>
            </section>

            <ZapSignDialog open={zapOpen} onOpenChange={setZapOpen} />
        </div>
    )
}
