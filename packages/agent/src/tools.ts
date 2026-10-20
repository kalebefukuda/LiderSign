import { createTool } from '@mastra/core/tools'
import {
    AUDIT_EVENT_LABEL,
    ENVELOPE_STATUS_LABEL,
    isValidBrPhone,
    isValidCpf,
    missingVariables,
    normalizeBrPhone,
    onlyDigits,
    type EnvelopeStatus,
    type TemplateDto,
} from '@lidersign/shared'
import { z } from 'zod'
import { LiderSignApiError, LiderSignClient } from './lidersign-client.js'

/**
 * As 4 ferramentas que o modal da ZapSign promete "em breve" (listar modelos, ver campos,
 * criar documento e ver status), prontas para o Assistente e os agentes da LíderHub.
 * Erros voltam como texto em português, para o agente explicar ao advogado o que fazer.
 */

type ToolResult<T> = ({ ok: true } & T) | { ok: false; erro: string; detalhes?: string[] }

let sharedClient: LiderSignClient | undefined
function client(): LiderSignClient {
    sharedClient ??= new LiderSignClient()
    return sharedClient
}

/** Permite injetar um cliente (testes ou outro escritório). */
export function setLiderSignClient(value: LiderSignClient | undefined): void {
    sharedClient = value
}

function fail(error: unknown): { ok: false; erro: string; detalhes?: string[] } {
    if (error instanceof LiderSignApiError) {
        return {
            ok: false,
            erro: error.message,
            detalhes: error.issues.length
                ? error.issues.map((issue) => `${issue.path}: ${issue.message}`)
                : undefined,
        }
    }
    return { ok: false, erro: error instanceof Error ? error.message : String(error) }
}

function describeStatus(status: EnvelopeStatus): string {
    return ENVELOPE_STATUS_LABEL[status] ?? status
}

function summarizeTemplate(template: TemplateDto) {
    return {
        id: template.id,
        nome: template.name,
        tipo: template.kind,
        nivelDeGarantia: template.assuranceLevel,
        versao: template.version,
        quantidadeDeCampos: template.variables.length,
    }
}

export const listarModelos = createTool({
    id: 'listar_modelos',
    description:
        'Lista os modelos de documento (contratos, procurações, declarações) que o escritório já tem no LíderSign. ' +
        'Use antes de criar um documento para descobrir o id do modelo certo.',
    inputSchema: z.object({}),
    execute: async (_input, context): Promise<ToolResult<{ modelos: ReturnType<typeof summarizeTemplate>[] }>> => {
        try {
            const templates = await client().listTemplates(context?.abortSignal)
            return { ok: true, modelos: templates.map(summarizeTemplate) }
        } catch (error) {
            return fail(error)
        }
    },
})

export const verCamposDoModelo = createTool({
    id: 'ver_campos_do_modelo',
    description:
        'Mostra os campos (variáveis) que um modelo pede para gerar o documento, com rótulo, tipo e exemplo. ' +
        'Use para saber quais dados do lead coletar antes de chamar criar_documento_para_assinar.',
    inputSchema: z.object({
        modeloId: z.string().min(1).describe('Id do modelo, vindo de listar_modelos'),
    }),
    execute: async ({ modeloId }, context) => {
        try {
            const template = await client().getTemplate(modeloId, context?.abortSignal)
            return {
                ok: true as const,
                modelo: summarizeTemplate(template),
                campos: template.variables.map((variable) => ({
                    chave: variable.key,
                    rotulo: variable.label,
                    tipo: variable.type,
                    exemplo: variable.example ?? null,
                })),
            }
        } catch (error) {
            return fail(error)
        }
    },
})

export const criarDocumentoParaAssinar = createTool({
    id: 'criar_documento_para_assinar',
    description:
        'Gera o documento a partir de um modelo com os dados do lead e envia o link de assinatura pelo WhatsApp do signatário. ' +
        'Preencha todas as variáveis do modelo (consulte ver_campos_do_modelo). O CPF precisa ser válido e o celular ter DDD. ' +
        'Retorna o status, o link de verificação pública e um resumo para mostrar ao advogado.',
    inputSchema: z.object({
        modeloId: z.string().min(1).describe('Id do modelo, vindo de listar_modelos'),
        variaveis: z
            .record(z.string(), z.string())
            .describe('Valores das variáveis do modelo, por chave. Ex.: { "nome_cliente": "Maria Aparecida dos Santos" }'),
        signatario: z.object({
            nome: z.string().min(3).describe('Nome completo de quem vai assinar'),
            cpf: z.string().describe('CPF de quem vai assinar, com ou sem pontuação'),
            celular: z.string().describe('Celular com DDD, ex.: (47) 99999-0000'),
        }),
        referenciaExterna: z
            .string()
            .max(120)
            .optional()
            .describe('Id do lead ou da conversa na LíderHub, devolvido nos webhooks'),
    }),
    execute: async ({ modeloId, variaveis, signatario, referenciaExterna }, context) => {
        try {
            const problemas: string[] = []
            if (!isValidCpf(signatario.cpf)) problemas.push('CPF do signatário inválido.')
            if (!isValidBrPhone(signatario.celular)) problemas.push('Celular do signatário inválido: informe DDD + número.')
            if (problemas.length) {
                return { ok: false as const, erro: 'Não criei o documento.', detalhes: problemas }
            }

            const template = await client().getTemplate(modeloId, context?.abortSignal)
            const faltando = missingVariables(template.body, variaveis)
            if (faltando.length) {
                const rotulos = faltando.map((key) => {
                    const variable = template.variables.find((item) => item.key === key)
                    return variable ? `${variable.label} (${key})` : key
                })
                problemas.push(`Faltam variáveis do modelo: ${rotulos.join(', ')}.`)
            }
            if (problemas.length) {
                return { ok: false as const, erro: 'Não criei o documento.', detalhes: problemas }
            }

            const envelope = await client().createEnvelope(
                {
                    templateId: modeloId,
                    variables: variaveis,
                    signer: {
                        name: signatario.nome,
                        cpf: onlyDigits(signatario.cpf),
                        phone: normalizeBrPhone(signatario.celular),
                    },
                    externalRef: referenciaExterna,
                    send: true,
                },
                context?.abortSignal,
            )
            return {
                ok: true as const,
                documentoId: envelope.id,
                titulo: envelope.title,
                status: describeStatus(envelope.status),
                linkDeVerificacao: envelope.verificationUrl,
                codigoDeVerificacao: envelope.verificationCode,
                expiraEm: envelope.expiresAt,
                resumo:
                    `"${envelope.title}" foi enviado pelo WhatsApp para ${envelope.signer.name} (${envelope.signer.phoneMasked}). ` +
                    `Assim que assinar, o PDF selado fica disponível e a verificação pública fica em ${envelope.verificationUrl}.`,
            }
        } catch (error) {
            return fail(error)
        }
    },
})

export const verStatusDoDocumento = createTool({
    id: 'ver_status_do_documento',
    description:
        'Consulta o status de um documento enviado para assinatura (Enviado, Visto, Selando, Assinado, Cancelado ou Expirado), ' +
        'os últimos passos da trilha de auditoria e o link de verificação pública.',
    inputSchema: z.object({
        documentoId: z.string().min(1).describe('Id do documento, devolvido por criar_documento_para_assinar'),
    }),
    execute: async ({ documentoId }, context) => {
        try {
            const envelope = await client().getEnvelope(documentoId, context?.abortSignal)
            const ultimosPassos = envelope.events.slice(-6).map((event) => ({
                passo: event.label || AUDIT_EVENT_LABEL[event.type] || event.type,
                quando: event.createdAt,
            }))
            return {
                ok: true as const,
                documentoId: envelope.id,
                titulo: envelope.title,
                status: describeStatus(envelope.status),
                assinadoEm: envelope.signedAt,
                concluidoEm: envelope.completedAt,
                signatario: envelope.signer,
                carimboDoTempo: envelope.timestamp.status,
                linkDeVerificacao: envelope.verificationUrl,
                ultimosPassos,
            }
        } catch (error) {
            return fail(error)
        }
    },
})

export const liderSignTools = {
    listar_modelos: listarModelos,
    ver_campos_do_modelo: verCamposDoModelo,
    criar_documento_para_assinar: criarDocumentoParaAssinar,
    ver_status_do_documento: verStatusDoDocumento,
}
