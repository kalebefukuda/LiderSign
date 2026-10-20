import { Bot } from 'lucide-react'
import { Link } from 'react-router'

import { Kicker } from '@/components/ui/primitives'
import { CopyButton } from '@/components/ui/states'

import { CallLog } from './call-log'

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

const MCP_TOOLS = [
    'Listar modelos',
    'Ver campos do modelo',
    'Criar documento para assinar',
    'Ver status do documento',
]

const mcpCommand = (origin: string) => `claude mcp add lidersign \\
  -e LIDERSIGN_API_URL=${origin}/v1 \\
  -e PARTNER_API_KEY=<chave de parceiro do .env> \\
  -e LIDERSIGN_TENANT_ID=escritorio-demo \\
  -- node packages/agent/dist/mcp-stdio.js`

/** Como a LíderHub usa o LíderSign: os três passos, o registro das chamadas e o MCP. */
export function IntegrationPage() {
    const command = mcpCommand(window.location.origin)

    return (
        <div className="space-y-14">
            <section aria-labelledby="como-funciona" className="space-y-4">
                <Kicker id="como-funciona">Como funciona</Kicker>
                <ol className="divide-y divide-line rounded-2xl border border-line">
                    {STEPS.map((step, index) => (
                        <li
                            key={step.title}
                            className="grid gap-2 px-5 py-5 sm:grid-cols-[40px_160px_1fr] sm:gap-4"
                        >
                            <span className="font-mono text-sm text-subtle tabular">0{index + 1}</span>
                            <span>
                                <span className="block font-semibold">{step.title}</span>
                                <span className="mt-0.5 block font-mono text-[12px] text-brand">
                                    {step.route}
                                </span>
                            </span>
                            <span className="text-[15px] leading-relaxed text-ink/80">{step.text}</span>
                        </li>
                    ))}
                </ol>
            </section>

            <section aria-labelledby="experimente" className="space-y-3">
                <Kicker id="experimente">Experimente</Kicker>
                <p className="max-w-2xl text-[15px] leading-relaxed text-ink/80">
                    A{' '}
                    <Link to="/liderhub" className="font-medium text-brand hover:underline">
                        simulação da LíderHub
                    </Link>{' '}
                    mostra os três passos do lado de quem usa: o switch em Integrações, o contrato saindo pela
                    conversa e o status voltando. Cada chamada aparece no registro abaixo.
                </p>
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
                        <pre className="overflow-x-auto font-mono text-[12px] leading-relaxed text-white/90">
                            {command}
                        </pre>
                        <CopyButton
                            value={command}
                            label="Copiar comando"
                            className="shrink-0 text-white/80 hover:bg-white/10 hover:text-white"
                        />
                    </div>
                </div>
            </section>
        </div>
    )
}
