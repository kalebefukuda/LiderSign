import { Injectable, Logger } from '@nestjs/common'
import {
    envelopeEntry,
    FUNNEL_STALL_LABEL,
    importedEntry,
    maskName,
    summarizeFunnel,
    type AssistantAction,
    type AssistantMessageInput,
    type AssistantReply,
    type CreateTemplateInput,
    type EnvelopeDto,
} from '@lidersign/shared'
import type { Tenant } from '@prisma/client'
import { AiService, type AiContent, type AiMessage, type AiTool } from '../ai/ai.service'
import { toEnvelopeDto } from '../common/mappers'
import { importedContracts } from '../contracts/imported'
import { EnvelopesService } from '../envelopes/envelopes.service'
import { PrismaService } from '../prisma/prisma.service'
import { TemplateImportService } from '../templates/template-import.service'
import { TemplatesService } from '../templates/templates.service'

type UploadedFile = { buffer: Buffer; originalname: string; mimetype: string; size: number }
type ToolResult = { content: string; actions: AssistantAction[] }

const STEP_LABEL: Record<string, string> = {
    listar_pendentes: 'Consultou os contratos aguardando assinatura',
    resumo_contratos: 'Calculou o funil e a taxa de fechamento',
    lembrar_parados: 'Mandou lembretes na conversa do WhatsApp',
    listar_modelos: 'Listou os modelos de contrato',
}

const PAGE_LABEL: Record<string, string> = {
    atendimento: 'Caixa de entrada (conversas do WhatsApp)',
    contratos: 'Contratos (funil e lista)',
    modelos: 'Modelos de contrato',
    configuracoes: 'Configurações',
}

const TOOLS: AiTool[] = [
    {
        name: 'listar_pendentes',
        description:
            'Lista os contratos enviados que ainda não foram assinados, com a etapa em que cada pessoa parou e há quanto tempo.',
        input_schema: { type: 'object', properties: {} },
    },
    {
        name: 'resumo_contratos',
        description:
            'Funil de assinatura (recebeu, abriu, confirmou CPF, assinou) e taxa de fechamento dos contratos da LíderHub, comparados ao histórico importado do ZapSign.',
        input_schema: { type: 'object', properties: {} },
    },
    {
        name: 'lembrar_parados',
        description:
            'Manda um lembrete na conversa do WhatsApp para quem está parado sem assinar. Só use quando o usuário pedir para lembrar, cobrar ou dar um empurrão.',
        input_schema: { type: 'object', properties: {} },
    },
    {
        name: 'listar_modelos',
        description: 'Lista os modelos de contrato do escritório.',
        input_schema: { type: 'object', properties: {} },
    },
]

const NUDGE_INTENT = /lembr|cobr|empurr|follow|destrav|parad|cutuc/

function since(iso: string, now = Date.now()) {
    const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60_000))
    if (minutes < 60) return `há ${minutes} min`
    const hours = Math.round(minutes / 60)
    if (hours < 48) return `há ${hours} h`
    return `há ${Math.round(hours / 24)} dias`
}

function percent(value: number) {
    return `${Math.round(value * 100)}%`
}

function plain(text: string) {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/**
 * O Assistente do módulo de contratos. Com a IA ligada, o Claude decide quais consultas fazer
 * (ferramentas acima). Sem ela, um roteiro reserva cobre as perguntas mais comuns.
 * Para a IA vão só primeiro nome e inicial do sobrenome, título e etapa: nada de CPF ou telefone.
 */
@Injectable()
export class AssistantService {
    private readonly logger = new Logger('Assistente')

    constructor(
        private readonly ai: AiService,
        private readonly prisma: PrismaService,
        private readonly envelopes: EnvelopesService,
        private readonly templates: TemplatesService,
        private readonly importer: TemplateImportService,
    ) {}

    private async open(tenant: Tenant): Promise<EnvelopeDto[]> {
        await this.envelopes.expireOverdue({ tenantId: tenant.id })
        const rows = await this.prisma.envelope.findMany({
            where: { tenantId: tenant.id, status: { in: ['SENT', 'VIEWED'] } },
            orderBy: { createdAt: 'asc' },
            take: 50,
        })
        return rows.map((row) => toEnvelopeDto(row))
    }

    private async pending(tenant: Tenant): Promise<ToolResult> {
        const open = await this.open(tenant)
        const lines = open.map((envelope) => {
            const entry = envelopeEntry(envelope)
            return {
                id: envelope.id,
                nome: maskName(envelope.signer.name),
                documento: envelope.title,
                onde_parou: FUNNEL_STALL_LABEL[entry.stage],
                ultima_movimentacao: since(entry.lastActivityAt),
                lembrete_enviado: Boolean(envelope.remindedAt),
            }
        })
        return {
            content: JSON.stringify({ total: lines.length, pendentes: lines }),
            actions: lines.length
                ? [
                      {
                          type: 'navigate',
                          to: '/contratos?status=aguardando',
                          label: 'Ver pendentes em Contratos',
                      },
                  ]
                : [],
        }
    }

    private async summary(tenant: Tenant): Promise<ToolResult> {
        const rows = await this.prisma.envelope.findMany({
            where: { tenantId: tenant.id, status: { not: 'CANCELED' } },
            take: 1000,
        })
        const ours = summarizeFunnel(rows.map((row) => envelopeEntry(toEnvelopeDto(row))))
        const zapsign = summarizeFunnel(importedContracts(tenant.id).map(importedEntry))
        const describe = (funnel: typeof ours) => ({
            enviados: funnel.total,
            abriram: funnel.reached.VIEWED,
            confirmaram_cpf: funnel.reached.IDENTITY,
            assinaram: funnel.reached.SIGNED,
            aguardando: funnel.open,
            taxa_de_fechamento: percent(funnel.closingRate),
        })
        return {
            content: JSON.stringify({
                liderhub_whatsapp: describe(ours),
                historico_zapsign_exemplo: describe(zapsign),
                observacao: 'O histórico do ZapSign é um exemplo simulado para a demonstração.',
            }),
            actions: [{ type: 'navigate', to: '/contratos', label: 'Abrir o funil em Contratos' }],
        }
    }

    private async nudge(tenant: Tenant): Promise<ToolResult> {
        const nudged = await this.envelopes.nudgeStalled(tenant)
        return {
            content: JSON.stringify({
                lembrados: nudged.map((envelope) => ({
                    id: envelope.id,
                    nome: maskName(envelope.signerName),
                    documento: envelope.title,
                })),
                observacao: nudged.length
                    ? 'O lembrete foi na própria conversa do WhatsApp, de acordo com a etapa em que cada pessoa parou.'
                    : 'Ninguém parado agora (ou já recebeu lembrete há pouco).',
            }),
            actions: nudged.length ? [{ type: 'contracts.nudged', count: nudged.length }] : [],
        }
    }

    private async listTemplates(tenant: Tenant): Promise<ToolResult> {
        const items = await this.templates.list(tenant)
        return {
            content: JSON.stringify(items.map((item) => ({ id: item.id, nome: item.name, tipo: item.kind }))),
            actions: [{ type: 'navigate', to: '/modelos', label: 'Abrir Modelos' }],
        }
    }

    private runTool(tenant: Tenant, name: string, userMessage: string): Promise<ToolResult> {
        switch (name) {
            case 'listar_pendentes':
                return this.pending(tenant)
            case 'resumo_contratos':
                return this.summary(tenant)
            case 'lembrar_parados':
                // Ferramenta que age fora do app: só roda se a pessoa pediu, não por decisão do modelo
                if (!NUDGE_INTENT.test(plain(userMessage))) {
                    return Promise.resolve({
                        content: '{"erro":"Só mando lembretes quando o usuário pede explicitamente."}',
                        actions: [],
                    })
                }
                return this.nudge(tenant)
            case 'listar_modelos':
                return this.listTemplates(tenant)
            default:
                return Promise.resolve({ content: '{"erro":"ferramenta desconhecida"}', actions: [] })
        }
    }

    async reply(tenant: Tenant, input: AssistantMessageInput): Promise<AssistantReply> {
        const started = Date.now()
        const ai = await this.replyWithAi(tenant, input)
        const result = ai ?? (await this.replyScripted(tenant, input))
        return { ...result, thoughtMs: Date.now() - started }
    }

    private async replyWithAi(
        tenant: Tenant,
        input: AssistantMessageInput,
    ): Promise<Omit<AssistantReply, 'thoughtMs'> | null> {
        if (!this.ai.enabled) return null
        const system =
            `Você é o Assistente da LíderHub para o escritório ${tenant.name}, dentro do módulo de contratos. ` +
            `O usuário está na tela: ${PAGE_LABEL[input.page ?? 'atendimento'] ?? input.page}. ` +
            'Responda em português do Brasil, direto e curto. Use **negrito** para números importantes e listas com "- " quando ajudar. ' +
            'Quando citar uma pessoa que veio de uma ferramenta com id, escreva o nome como link: [Nome](/contratos/ID). ' +
            'Use as ferramentas para consultar dados reais; nunca invente números. Só mande lembretes se o usuário pedir. ' +
            'Para criar um modelo a partir de um arquivo, peça para anexar o PDF ou Word pelo clipe. ' +
            'Não exponha CPF nem telefone. Termine, se fizer sentido, com uma pergunta curta de próximo passo.'
        const messages: AiMessage[] = [
            ...(input.history ?? []).map((item) => ({ role: item.role, content: item.text }) as AiMessage),
            { role: 'user', content: input.message },
        ]
        const actions: AssistantAction[] = []
        const steps: string[] = []
        let lookups = 0
        for (let round = 0; round < 4; round++) {
            const response = await this.ai.message({ system, messages, tools: TOOLS, maxTokens: 900 })
            if (!response) return null
            const uses = response.content.filter((block) => block.type === 'tool_use')
            if (response.stop_reason !== 'tool_use' || !uses.length) {
                const text = response.content
                    .filter((block) => block.type === 'text')
                    .map((block) => (block as { text: string }).text)
                    .join('\n')
                    .trim()
                return { reply: text || 'Pronto.', actions: dedupe(actions), engine: 'ai', lookups, steps }
            }
            messages.push({ role: 'assistant', content: response.content as AiContent[] })
            const results: AiContent[] = []
            for (const use of uses) {
                if (use.type !== 'tool_use') continue
                lookups += 1
                steps.push(STEP_LABEL[use.name] ?? use.name)
                const result = await this.runTool(tenant, use.name, input.message)
                actions.push(...result.actions)
                results.push({ type: 'tool_result', tool_use_id: use.id, content: result.content })
            }
            messages.push({ role: 'user', content: results })
        }
        this.logger.warn('A IA não concluiu em 4 rodadas; usando o roteiro reserva')
        return null
    }

    private async replyScripted(
        tenant: Tenant,
        input: AssistantMessageInput,
    ): Promise<Omit<AssistantReply, 'thoughtMs'>> {
        const text = plain(input.message)

        if (NUDGE_INTENT.test(text)) {
            const result = await this.nudge(tenant)
            const data = JSON.parse(result.content) as {
                lembrados: { id: string; nome: string; documento: string }[]
            }
            if (!data.lembrados.length) {
                return {
                    reply: 'Ninguém parado agora. Quem está aguardando já recebeu lembrete há pouco ou acabou de receber o contrato.',
                    actions: [],
                    engine: 'scripted',
                    lookups: 1,
                    steps: [STEP_LABEL.lembrar_parados],
                }
            }
            const lines = data.lembrados.map(
                (item) => `- [${item.nome}](/contratos/${item.id}) · ${item.documento}`,
            )
            return {
                reply: `Mandei lembrete para **${data.lembrados.length} ${data.lembrados.length === 1 ? 'pessoa' : 'pessoas'}**, na própria conversa do WhatsApp e de acordo com onde cada uma parou:\n\n${lines.join('\n')}\n\nAviso aqui quando alguém assinar.`,
                actions: result.actions,
                engine: 'scripted',
                lookups: 1,
                steps: [STEP_LABEL.lembrar_parados],
            }
        }

        if (/assin|pendent|aguard|falta|nao fech|quem/.test(text) && !/modelo/.test(text)) {
            const result = await this.pending(tenant)
            const data = JSON.parse(result.content) as {
                pendentes: {
                    id: string
                    nome: string
                    documento: string
                    onde_parou: string
                    ultima_movimentacao: string
                }[]
            }
            if (!data.pendentes.length) {
                return {
                    reply: 'Ninguém pendente: todos os contratos enviados já foram assinados.',
                    actions: [],
                    engine: 'scripted',
                    lookups: 1,
                    steps: [STEP_LABEL.listar_pendentes],
                }
            }
            const lines = data.pendentes.map(
                (item) =>
                    `- [${item.nome}](/contratos/${item.id}) · ${item.onde_parou.toLowerCase()} · ${item.ultima_movimentacao}`,
            )
            return {
                reply: `**${data.pendentes.length} ${data.pendentes.length === 1 ? 'contrato aguarda' : 'contratos aguardam'}** assinatura:\n\n${lines.join('\n')}\n\nQuer que eu mande um lembrete para quem está parado?`,
                actions: result.actions,
                engine: 'scripted',
                lookups: 1,
                steps: [STEP_LABEL.listar_pendentes],
            }
        }

        if (/taxa|fecha|funil|convers|resumo|quant|zapsign|compar|result/.test(text)) {
            const result = await this.summary(tenant)
            const data = JSON.parse(result.content) as Record<
                'liderhub_whatsapp' | 'historico_zapsign_exemplo',
                { enviados: number; abriram: number; assinaram: number; taxa_de_fechamento: string }
            >
            const ours = data.liderhub_whatsapp
            const theirs = data.historico_zapsign_exemplo
            return {
                reply:
                    `Pela conversa do WhatsApp: **${ours.enviados}** enviados, **${ours.abriram}** abriram e **${ours.assinaram}** assinaram. Taxa de fechamento de **${ours.taxa_de_fechamento}**.\n\n` +
                    `No histórico do ZapSign (exemplo): ${theirs.enviados} enviados, ${theirs.assinaram} assinados, **${theirs.taxa_de_fechamento}**. A maior parte parava antes de abrir o link.`,
                actions: result.actions,
                engine: 'scripted',
                lookups: 1,
                steps: [STEP_LABEL.resumo_contratos],
            }
        }

        if (/modelo|template/.test(text)) {
            const result = await this.listTemplates(tenant)
            const items = JSON.parse(result.content) as { id: string; nome: string }[]
            const lines = items.map((item) => `- [${item.nome}](/modelos/${item.id})`)
            return {
                reply: `Você tem **${items.length} ${items.length === 1 ? 'modelo' : 'modelos'}**:\n\n${lines.join('\n')}\n\nPara criar um novo, anexe o contrato em PDF ou Word pelo clipe que eu marco os campos.`,
                actions: result.actions,
                engine: 'scripted',
                lookups: 1,
                steps: [STEP_LABEL.listar_modelos],
            }
        }

        return {
            reply: 'Posso ajudar com os contratos:\n\n- **Quem não assinou** e onde cada pessoa parou\n- **Lembrar quem parou**, na própria conversa do WhatsApp\n- **Taxa de fechamento**, comparada ao ZapSign\n- **Criar um modelo** a partir de um PDF ou Word (anexe pelo clipe)',
            actions: [],
            engine: 'scripted',
            lookups: 0,
            steps: [],
        }
    }

    /** "Quero um novo modelo de contrato com esse exemplo": lê o arquivo, marca os campos e salva. */
    async createTemplate(tenant: Tenant, file: UploadedFile | undefined): Promise<AssistantReply> {
        const started = Date.now()
        const draft = await this.importer.import(file)
        const name = draft.suggestedName.trim().slice(0, 120) || 'Novo modelo'
        const input: CreateTemplateInput = {
            name: name.length >= 3 ? name : `Modelo ${name}`,
            kind: draft.kind,
            assuranceLevel: draft.kind === 'PROCURACAO' ? 'REFORCADO' : 'PADRAO',
            body: draft.body,
            variables: draft.variables,
        }
        const template = await this.templates.create(tenant, input)
        const fields = draft.variables.map((variable) => variable.label).slice(0, 8)
        const more =
            draft.variables.length > fields.length ? ` e mais ${draft.variables.length - fields.length}` : ''
        return {
            reply:
                `Criei o modelo **${template.name}** com **${draft.variables.length} campos**: ${fields.join(', ')}${more}.\n\n` +
                'Os campos do cliente são preenchidos com os dados da conversa na hora de enviar. Vale revisar o texto antes do primeiro envio.' +
                (draft.warnings.length ? `\n\nObservação: ${draft.warnings[0]}` : ''),
            actions: [
                { type: 'template.created', templateId: template.id, name: template.name },
                { type: 'navigate', to: `/modelos/${template.id}`, label: 'Revisar o modelo' },
            ],
            engine: draft.engine === 'ai' ? 'ai' : 'scripted',
            thoughtMs: Date.now() - started,
            lookups: 2,
            steps: [
                draft.engine === 'ai'
                    ? 'Leu o arquivo e marcou os campos com IA'
                    : 'Leu o arquivo e marcou os campos',
                'Salvou o novo modelo',
            ],
        }
    }
}

function dedupe(actions: AssistantAction[]) {
    const seen = new Set<string>()
    return actions.filter((action) => {
        const key = JSON.stringify(action)
        if (seen.has(key)) return false
        seen.add(key)
        return true
    })
}
