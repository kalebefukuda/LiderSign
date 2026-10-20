# LíderSign

Assinador eletrônico nativo da LíderHub: o escritório ativa com um clique, o cliente assina pelo WhatsApp e o advogado recebe um PDF selado, pronto para o processo.

> Projeto de demonstração para o desafio técnico da LíderHub. Modelos de contrato, escritório e cliente são fictícios.

![LíderSign](apps/web/public/og.png)

## O problema

- **Configurar é difícil.** Para usar um assinador externo, cada escritório precisa de conta, plano com API e um token. O advogado precisa saber o que é uma API e onde pegar a chave.
- **Custo e dependência.** Cada escritório paga um plano em outra plataforma, e a jornada do contrato sai da LíderHub.
- **Prova fraca em litígio de massa.** Algumas varas questionam procurações assinadas em plataformas privadas. A [Recomendação CNJ 159/2024](https://www.tjac.jus.br/wp-content/uploads/2024/11/SEI_2007215_Recomendacao_159.pdf) lista a procuração com assinatura não qualificada como indício de litigância abusiva. Por outro lado, o [STJ (REsp 2.223.695)](https://www.migalhas.com.br/quentes/451530/stj-procuracao-eletronica-nao-precisa-de-certificacao-da-icp-brasil) aceita procuração sem ICP-Brasil quando há mecanismos confiáveis de autoria e integridade. O problema não é a marca do assinador: é a força da prova.

## A proposta: três ideias

| | Como | Na prática |
| --- | --- | --- |
| **Zero configuração** | A LíderHub usa uma chave de parceiro e cria a conta do escritório sozinha | Um switch em Integrações. Sem token, sem conta externa |
| **WhatsApp primeiro** | O link chega na conversa que já existe, o código de confirmação também | 4 passos no celular, letras grandes, botão "Ouvir o contrato" |
| **Feito para o juiz** | Selo PAdES, carimbo do tempo RFC 3161, página de evidências, trilha com hash encadeado e QR de verificação | O juiz confere a autenticidade pelo código ou enviando o arquivo |

## Rodar em um comando

Precisa só do Docker.

```bash
docker compose up --build
```

Abra **http://localhost:3000/demo** e siga o roteiro (uns 2 minutos):

1. **Integrações:** abra o "Conectar" da ZapSign para ver o caminho de hoje. Depois ative o LíderSign no switch.
2. **Atendimento:** a conversa com a lead já está qualificada. Clique em "Enviar para assinatura".
3. **Celular simulado (à direita):** toque no link e assine. O código de confirmação chega no próprio celular simulado.
4. **Envelopes:** acompanhe o status ao vivo e os webhooks que a LíderHub recebeu, com o HMAC conferido. Em "Trilha e arquivos", baixe o PDF selado.
5. **Verificação:** abra o link de verificação e envie o PDF (confere). Mude um byte do arquivo e envie de novo (não confere).

Não precisa de conta de WhatsApp nem de chave de IA: tudo tem um modo local.

## Desenvolvimento

Requisitos: Node 22, pnpm 10 (`corepack enable`) e um Postgres 16.

```bash
# Postgres local (se não tiver um)
docker run -d --name lidersign-db -p 5432:5432 \
  -e POSTGRES_USER=lidersign -e POSTGRES_PASSWORD=lidersign -e POSTGRES_DB=lidersign postgres:16-alpine

cp .env.example .env
pnpm install
pnpm build          # shared, agent, web e api
pnpm db:migrate
pnpm dev            # Nest na porta 4000 e Vite na 3000
```

Abra http://localhost:3000/demo. Em desenvolvimento, o Vite faz proxy de `/v1`, `/demo-host` e `/health` para o Nest.

### Testes

```bash
pnpm e2e            # com o app no ar; outra URL: E2E_BASE_URL=http://localhost:4000 pnpm e2e
```

O teste ponta a ponta ativa o escritório, gera o contrato, assina pelo celular (viewport de 390 px), espera o PDF selado, confere o arquivo na verificação pública, confirma que uma cópia alterada é rejeitada e que a LíderHub recebeu os webhooks com HMAC válido. Roda no GitHub Actions a cada push.

## WhatsApp de verdade

O envio passa por um provedor trocável: `WHATSAPP_PROVIDER=simulator` (padrão) ou `cloud_api` (API oficial da Meta). Para testar no seu celular com o número de teste gratuito da Meta e um túnel HTTPS, siga [infra/tunnel.md](infra/tunnel.md).

Na integração real, quem manda a mensagem é a própria LíderHub, pelo número oficial que já conversa com o lead: o LíderSign devolve o link e avisa por webhook.

## O Assistente da LíderHub usando o LíderSign (MCP)

O modal da ZapSign promete que "em breve" o agente vai listar modelos, ver campos, criar documento e ver status. O LíderSign já entrega essas 4 ferramentas num servidor MCP feito com Mastra. Com o app no ar, compile o agente na sua máquina (`pnpm install && pnpm --filter @lidersign/agent build`) e ligue no Claude Code:

```bash
claude mcp add lidersign \
  -e LIDERSIGN_API_URL=http://localhost:3000/v1 \
  -e PARTNER_API_KEY=demo-partner-key-troque-em-producao \
  -e LIDERSIGN_TENANT_ID=escritorio-demo \
  -- node packages/agent/dist/mcp-stdio.js
```

Depois é só pedir: *"Gere o contrato de honorários da Maria Aparecida dos Santos com o modelo BPC/LOAS e mande para o WhatsApp dela."* Detalhes em [packages/agent/README.md](packages/agent/README.md).

## Como funciona

```
apps/web          React + Vite: demo, painel do escritório, assinatura e verificação
apps/api          NestJS: API, selagem do PDF, webhooks e tempo real; serve o site
packages/shared   Contrato entre as partes: schemas zod, tipos e utilitários
packages/agent    Mastra: servidor MCP e IA que transforma contrato em modelo
```

Mesma stack da LíderHub: React, Nest e TypeScript de ponta a ponta. O Nest serve a API e o site na mesma porta: um container, uma URL. O banco é Postgres (o Supabase também é: troca só a `DATABASE_URL`).

Rotas, ciclo do envelope e formato dos webhooks: [docs/spec.md](docs/spec.md). Decisões: [docs/adr](docs/adr).

### O que vai no PDF assinado

- O documento original, com um rodapé de verificação em todas as páginas.
- **Página de evidências:** signatário (CPF mascarado), telefone confirmado por código, assinatura, IP, dispositivo, geolocalização (se autorizada), aceite, SHA-256 do original, carimbo do tempo, trilha de auditoria e QR de verificação.
- **Selo PAdES** (`ETSI.CAdES.detached`) com o certificado da plataforma: qualquer alteração no arquivo invalida o selo.
- **Carimbo do tempo RFC 3161** sobre o hash do original, baixável como `.tsr` e verificável com `openssl ts -verify`.

Dois níveis de garantia, escolhidos no modelo (nunca a cada envio):

| Nível | Autenticação | Uso |
| --- | --- | --- |
| Padrão | Código no WhatsApp + IP, dispositivo e geolocalização consentida | Contratos de honorários e propostas |
| Reforçado | Padrão + selfie | Procurações e declarações em litígio de massa |

> Pesquisa usada para orientar o produto, não é parecer jurídico. Validar com especialista antes de uso com clientes.

## Segurança e LGPD

- **A01/A07:2025:** a chave de parceiro fica só no servidor (comparação em tempo constante). O link de assinatura é um token aleatório de 32 bytes, e o banco guarda só o hash. O código de 6 dígitos vale 10 minutos, permite 5 tentativas e também é guardado como hash.
- **A07:2025:** o código e o token do link vão só para o WhatsApp do signatário. O escritório vê as mensagens com esses valores ocultos, e no banco eles nem chegam. Limite atômico de tentativas e no máximo 5 códigos por documento.
- **A01:2025 (SSRF):** webhooks só para hosts permitidos (`WEBHOOK_ALLOWED_HOSTS`), assinados com HMAC-SHA256.
- **A04:2025:** segredos só em variáveis de ambiente. Em produção, o certificado e-CNPJ fica num cofre.
- **A05:2025:** toda entrada é validada com zod, e os uploads são conferidos pelos bytes iniciais, não pela extensão.
- **A08/A09:2025:** o documento fica imutável depois do envio. A trilha de auditoria é append-only e cada evento carrega o hash do anterior. A verificação pública recalcula a cadeia e mostra se ela confere.
- **Também:** limite de requisições nas rotas públicas e cabeçalhos de segurança (helmet).
- **LGPD:**
    - CPF e telefone aparecem mascarados nas telas, nos logs e na verificação pública (art. 6º, III).
    - A selfie, que é dado biométrico, só é pedida no nível Reforçado, com aviso e consentimento (art. 11).
    - O escritório é o controlador e a LíderHub, a operadora.
- **Só para a demo:** o módulo `/demo-host` simula o back da LíderHub e não tem autenticação. Ele só existe com `DEMO_MODE=true`, deixa passar apenas as rotas que a tela usa (nunca as de parceiro) e nunca deve ir para produção. Com túnel aberto, a demo fica pública: feche o túnel depois de gravar.

## Próximos passos

- **Nível Reforçado completo:** Pix de R$ 0,01 vinculado ao CPF e biometria (Serpro Datavalid).
- **Assinatura gov.br e ICP-Brasil:** e-CNPJ e carimbo de ACT credenciada no lugar do certificado de demonstração.
- **Carimbo do tempo embutido** na assinatura (PAdES-B-T), em vez de anexado ao dossiê.
- **Fila dedicada para a selagem**, com BullMQ.
- **Login do painel.** Dentro da LíderHub, o painel vira uma tela da própria plataforma.

## Como foi construído

O projeto foi construído com IA do começo ao fim:

1. Briefing a partir do vídeo do desafio.
2. Pesquisa jurídica e de mercado com fontes.
3. Contrato de API escrito antes do código, em `packages/shared` e `docs/spec.md`.
4. Agentes trabalhando em paralelo na API, no front e na infraestrutura, cada um validando o próprio trabalho com o fluxo real e capturas de tela.
5. Teste ponta a ponta no final.

Os bloqueios encontrados e como foram resolvidos estão em [docs/diario.md](docs/diario.md).
