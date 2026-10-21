import { Bot, RotateCcw } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'

import {
    Button,
    CopyButton,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    Kicker,
    errorMessage,
    useDocumentTitle,
} from '@lidersign/ui'

import { CallLog } from '@/components/call-log'
import { PageHeader } from '@/components/page-header'
import { hubApi } from '@/lib/api'
import { useHostStatus } from '@/lib/status'

const STEPS = [
    {
        title: 'Ativar',
        route: 'POST /v1/partner/tenants',
        text: 'O escritório clica em Ativar. O servidor da LíderHub cria a conta dele no LíderSign, já com dois modelos, e informa para onde mandar os avisos.',
    },
    {
        title: 'Enviar',
        route: 'POST /v1/envelopes',
        text: 'O agente escolhe o modelo e a LíderHub manda os dados do contato. O LíderSign gera o PDF e devolve o link, que segue pela conversa.',
    },
    {
        title: 'Acompanhar',
        route: 'Webhook com HMAC',
        text: 'A cada etapa (enviado, aberto, assinado, concluído) o LíderSign avisa a LíderHub. A assinatura HMAC prova que o aviso veio dele.',
    },
    {
        title: 'Abrir o painel',
        route: 'POST /v1/partner/tenants/:id/sessions',
        text: 'Para ver a trilha de auditoria ou editar modelos, a LíderHub pede um link de uso único e o escritório entra no LíderSign sem senha.',
    },
]

const MCP_TOOLS = [
    'Listar modelos',
    'Ver campos do modelo',
    'Criar documento para assinar',
    'Ver status do documento',
]

export function DocsPage() {
    useDocumentTitle('Docs da integração')
    const { status, reload } = useHostStatus()
    const [confirmReset, setConfirmReset] = React.useState(false)
    const [resetting, setResetting] = React.useState(false)
    const apiUrl = status?.lidersignUrl ?? 'http://localhost:3000'
    const command = `claude mcp add lidersign \\
  -e LIDERSIGN_API_URL=${apiUrl}/v1 \\
  -e PARTNER_API_KEY=<chave de parceiro do .env> \\
  -e LIDERSIGN_TENANT_ID=${status?.office.id ?? 'escritorio-demo'} \\
  -- node packages/agent/dist/mcp-stdio.js`

    async function reset() {
        setResetting(true)
        try {
            await hubApi.reset()
            await reload()
            setConfirmReset(false)
            toast.success('Demonstração reiniciada')
        } catch (error) {
            toast.error(errorMessage(error))
        } finally {
            setResetting(false)
        }
    }

    return (
        <div className="max-w-4xl space-y-12">
            <PageHeader
                title="Docs da integração"
                description="Como a LíderHub fala com o LíderSign. O escritório não precisa ler isto: para ele, é um botão."
            />

            <section aria-labelledby="caminho" className="space-y-4">
                <Kicker id="caminho">O caminho de um contrato</Kicker>
                <ol className="divide-y divide-line rounded-xl border border-line bg-white">
                    {STEPS.map((step, index) => (
                        <li
                            key={step.title}
                            className="grid gap-2 px-5 py-5 sm:grid-cols-[32px_280px_1fr] sm:gap-4"
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
                <p className="text-sm leading-relaxed text-muted">
                    A chave de parceiro fica só no servidor da LíderHub. O navegador do escritório nunca a
                    recebe.
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
                <div className="rounded-xl border border-line bg-white p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                        <Bot className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
                        <p className="text-[15px] leading-relaxed text-ink/85">
                            Os agentes da LíderHub usam as mesmas operações como ferramentas:{' '}
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

            <section aria-labelledby="reiniciar" className="space-y-4">
                <Kicker id="reiniciar">Demonstração</Kicker>
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-line bg-white p-5 sm:p-6">
                    <p className="max-w-xl text-[15px] leading-relaxed text-ink/80">
                        Apaga o escritório de demonstração no LíderSign, os contratos e o registro, para
                        começar do zero.
                    </p>
                    <Button variant="secondary" onClick={() => setConfirmReset(true)}>
                        <RotateCcw aria-hidden /> Reiniciar demonstração
                    </Button>
                </div>
            </section>

            <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
                <DialogContent>
                    <DialogTitle>Reiniciar a demonstração?</DialogTitle>
                    <DialogDescription>
                        Os contratos enviados e o escritório de demonstração serão apagados. Depois é só
                        ativar de novo em Integrações.
                    </DialogDescription>
                    <div className="mt-6 flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => setConfirmReset(false)}>
                            Cancelar
                        </Button>
                        <Button variant="danger" loading={resetting} onClick={() => void reset()}>
                            Reiniciar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
