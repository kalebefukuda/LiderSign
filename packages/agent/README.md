# @lidersign/agent

Duas peças de IA do LíderSign, feitas com [Mastra](https://mastra.ai) (a mesma base que a LíderHub usa):

1. **Servidor MCP** com as 4 ferramentas que o modal da ZapSign promete "em breve". Assim o Assistente e os agentes da LíderHub geram e enviam contratos dentro da conversa.
2. **Extrator de modelos**: lê um contrato de exemplo (PDF ou DOCX) e devolve um modelo com variáveis `{{snake_case}}`. A API usa quando existe `ANTHROPIC_API_KEY`; sem chave, ela cai para regras locais.

## Ferramentas do MCP

| Ferramenta | O que faz |
| --- | --- |
| `listar_modelos` | Lista os modelos do escritório |
| `ver_campos_do_modelo` | Mostra as variáveis que o modelo pede |
| `criar_documento_para_assinar` | Gera o documento e manda o link pelo WhatsApp |
| `ver_status_do_documento` | Status, últimos passos da trilha e link de verificação |

O servidor fala as duas eras do protocolo MCP (a revisão `2026-07-28` e a anterior, com `initialize`), então funciona com clientes novos e antigos.

## Variáveis de ambiente

| Variável | Para quê |
| --- | --- |
| `LIDERSIGN_API_URL` | Endereço da API. No Docker: `http://localhost:3000/v1`. Em desenvolvimento: `http://localhost:4000`. Pode ser com ou sem `/v1` |
| `PARTNER_API_KEY` | Chave de parceiro, a mesma do servidor (no `docker-compose.yml` de demo: `demo-partner-key-troque-em-producao`) |
| `LIDERSIGN_TENANT_ID` | Escritório em nome de quem o agente age, ex.: `escritorio-demo` |
| `MCP_PORT`, `MCP_HOST`, `MCP_TOKEN` | Só no modo HTTP. Fora de `127.0.0.1`, o `MCP_TOKEN` é obrigatório |

A chave de parceiro fica só no ambiente: o modelo nunca escolhe nem vê a credencial.

## Como ligar no Claude Code

Com o LíderSign rodando (no Docker, a API responde em `http://localhost:3000/v1`; em desenvolvimento, em `http://localhost:4000`):

```bash
pnpm --filter @lidersign/agent build

claude mcp add lidersign \
  -e LIDERSIGN_API_URL=http://localhost:3000/v1 \
  -e PARTNER_API_KEY=<sua chave de parceiro> \
  -e LIDERSIGN_TENANT_ID=escritorio-demo \
  -- node packages/agent/dist/mcp-stdio.js
```

## Como ligar no Claude Desktop

Em `claude_desktop_config.json`:

```json
{
    "mcpServers": {
        "lidersign": {
            "command": "node",
            "args": ["/caminho/para/lidersign/packages/agent/dist/mcp-stdio.js"],
            "env": {
                "LIDERSIGN_API_URL": "http://localhost:3000/v1",
                "PARTNER_API_KEY": "<sua chave de parceiro>",
                "LIDERSIGN_TENANT_ID": "escritorio-demo"
            }
        }
    }
}
```

## Modo HTTP (para agentes remotos)

```bash
MCP_TOKEN=<token longo> pnpm --filter @lidersign/agent mcp:http
# MCP em http://127.0.0.1:4100/mcp, com Authorization: Bearer <MCP_TOKEN>
```

## Prompt de exemplo

> Gere o contrato de honorários da Maria Aparecida dos Santos com o modelo BPC/LOAS e mande para o WhatsApp dela.

O agente chama `listar_modelos`, depois `ver_campos_do_modelo`, pergunta o que faltar (CPF, celular, percentual) e só então `criar_documento_para_assinar`. A mensagem chega no celular (ou no simulador da tela `/demo`).

## Testes

```bash
pnpm --filter @lidersign/agent build
pnpm --filter @lidersign/agent test
```

Os testes rodam o agente Mastra de verdade com um modelo falso (sem rede e sem chave) e conferem as regras do modelo gerado: chaves válidas, toda variável do texto declarada e nada sobrando.
