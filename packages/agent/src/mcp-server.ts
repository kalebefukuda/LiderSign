import { readFileSync } from 'node:fs'
import { MCPServer } from '@mastra/mcp'
import { liderSignTools } from './tools.js'

function packageVersion(): string {
    try {
        const raw = readFileSync(new URL('../package.json', import.meta.url), 'utf8')
        return (JSON.parse(raw) as { version?: string }).version ?? '0.0.0'
    } catch {
        return '0.0.0'
    }
}

export function createLiderSignMcpServer(): MCPServer {
    return new MCPServer({
        id: 'lidersign',
        name: 'LíderSign',
        title: 'LíderSign',
        version: packageVersion(),
        description: 'Assinatura eletrônica nativa da LíderHub: modelos, envio pelo WhatsApp e status.',
        instructions:
            'Use estas ferramentas para gerar documentos jurídicos a partir dos modelos do escritório e enviá-los ' +
            'para assinatura pelo WhatsApp. Fluxo: listar_modelos, ver_campos_do_modelo, criar_documento_para_assinar, ' +
            'ver_status_do_documento. Nunca invente dados do cliente: se faltar um campo, pergunte ao usuário.',
        tools: liderSignTools,
        protocolVersion: '2026-07-28',
    })
}
