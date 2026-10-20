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
| **WhatsApp primeiro** | O link chega na conversa que já existe; o cliente confirma o CPF e assina | 3 passos no celular, o PDF de verdade na tela, letra maior e "Ouvir" |
| **Feito para o juiz** | Selo PAdES, carimbo do tempo RFC 3161, página de evidências, trilha com hash encadeado e QR de verificação | O juiz confere a autenticidade pelo código ou enviando o arquivo |

## Rodar em um comando

Precisa só do Docker.

```bash
docker compose up --build
```

Abra **http://localhost:3000**. A demonstração começa pela **LíderHub (simulação)**, porque é de lá que o escritório usa o LíderSign no dia a dia:

1. **Integrações:** ligue o switch **Ativar LíderSign**. É o único passo do escritório: sem conta e sem token. Do lado, a ZapSign mostra o caminho de hoje (conta, plano com API e token).
2. **Atendimento:** a conversa com a lead já está pronta. No painel do contato, coloque o **seu** celular em "WhatsApp da Maria" e clique em **Enviar para assinatura**. O LíderSign gera o PDF e o link sai na conversa.
3. **Assinar no celular:** toque em **Abrir no meu WhatsApp** (ou aponte a câmera para o QR), abra o link, digite o CPF da lead (`529.982.247-25`), confira o contrato e toque em **Assinar**.
4. **O status volta para a conversa:** "Maria abriu", "Maria assinou" e o PDF assinado, sem sair da LíderHub.
5. **Contratos, sem sair da LíderHub:** a aba nova lista todos os contratos com filtro por status, busca, PDF assinado e atalho para a conversa. Em **Modelos**, as telas de modelos do LíderSign aparecem embutidas: o escritório sobe o contrato dele e a IA marca os campos. Hoje, com a ZapSign, o escritório precisa sair da LíderHub para isso.
6. **Painel do LíderSign:** **Abrir o LíderSign** leva ao painel próprio, para outras plataformas ou para quem usar o LíderSign sozinho.

Para a LíderHub de verdade, são dois caminhos: embutir as telas do LíderSign (prontas, zero trabalho para ela) ou fazer as telas no visual dela usando a mesma API, que já devolve contratos, status, PDFs e modelos.

### Quem faz o quê

| Quem | Onde | O que faz |
| --- | --- | --- |
| Escritório | LíderHub | Liga o LíderSign uma vez e envia contratos pelas conversas (ou o agente de IA envia) |
| Cliente | Celular | Recebe o link no WhatsApp, confirma o CPF, confere o PDF e assina. Nunca vê painel |
| LíderHub | Servidor dela | Fala com o LíderSign pela API (chave de parceiro) e recebe os avisos por webhook |
| Painel do LíderSign | Bastidor | Modelos, histórico e PDFs. Como o painel da ClickSign hoje, abre de vez em quando |

O link abre em qualquer celular porque o `docker compose` sobe junto um túnel HTTPS da Cloudflare (sem conta) e o app usa o endereço dele nos links. Pelo endereço público só abrem a assinatura e a verificação: o painel, a simulação e a área de desenvolvedores ficam restritos ao computador. `docker compose stop tunnel` desliga o túnel.

**Para quem avalia o código:** [/desenvolvedores](http://localhost:3000/desenvolvedores) explica a integração (as 3 chamadas, o registro ao vivo com HMAC conferido e o comando do MCP).

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

Abra http://localhost:3000. Sem o túnel, os links usam `WEB_PUBLIC_URL` e abrem só neste computador. Em desenvolvimento, o Vite faz proxy de `/v1`, `/demo-host` e `/health` para o Nest.

### Testes

```bash
pnpm e2e            # com o app no ar; outra URL: E2E_BASE_URL=http://localhost:4000 pnpm e2e
```

O teste ponta a ponta liga o LíderSign pela página de desenvolvedores, envia pelo painel, abre o link e assina pelo celular (viewport de 390 px) só com o CPF; confere que sem o CPF o documento não abre; pela API, gera o contrato, espera o PDF selado, confere o arquivo na verificação pública, confirma que uma cópia alterada é rejeitada e que a LíderHub recebeu os webhooks com HMAC válido. Roda no GitHub Actions a cada push.

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
apps/web          React + Vite: painel do escritório, assinatura e verificação
apps/api          NestJS: API, selagem do PDF, webhooks e tempo real; serve o site
packages/shared   Contrato entre as partes: schemas zod, tipos e utilitários
packages/agent    Mastra: servidor MCP e IA que transforma contrato em modelo
```

Mesma stack da LíderHub: React, Nest e TypeScript de ponta a ponta. O Nest serve a API e o site na mesma porta: um container, uma URL. O banco é Postgres (o Supabase também é: troca só a `DATABASE_URL`).

Rotas, ciclo do envelope e formato dos webhooks: [docs/spec.md](docs/spec.md). Decisões: [docs/adr](docs/adr).

### O que vai no PDF assinado

- O documento original, com um rodapé de verificação em todas as páginas.
- **Bloco de assinatura no fim do contrato:** já vem no PDF que o cliente lê (linha, nome, papel e CPF mascarado). Na selagem, a assinatura (nome em letra cursiva ou o desenho) entra ali, com data, hora e código.
- **Página de evidências:** signatário (CPF mascarado), como foi identificado (CPF digitado, link pessoal no WhatsApp e, no nível com selfie, código e selfie), assinatura, IP, dispositivo, aceite, SHA-256 do original, carimbo do tempo, trilha de auditoria e QR de verificação.
- **Selo PAdES** (`ETSI.CAdES.detached`) com o certificado da plataforma: qualquer alteração no arquivo invalida o selo.
- **Carimbo do tempo RFC 3161** sobre o hash do original, baixável como `.tsr` e verificável com `openssl ts -verify`.

Dois níveis de garantia, escolhidos no modelo (nunca a cada envio):

| Nível | Autenticação | Uso |
| --- | --- | --- |
| Padrão | Link pessoal no WhatsApp + CPF digitado por quem assina + IP e dispositivo | Contratos de honorários e propostas |
| Com selfie | Padrão + código no WhatsApp + selfie | Procurações e declarações em litígio de massa |

> Pesquisa usada para orientar o produto, não é parecer jurídico. Validar com especialista antes de uso com clientes.

## Segurança e LGPD

- **A01/A07:2025:** a chave de parceiro fica só no servidor (comparação em tempo constante). O link de assinatura é um token aleatório de 32 bytes, e o banco guarda só o hash. O código de 6 dígitos vale 10 minutos, permite 5 tentativas e também é guardado como hash.
- **A01/A07:2025:** o link sozinho não abre o contrato: o signatário digita o próprio CPF (5 tentativas por link, reserva atômica) antes de ver o texto ou o PDF (LGPD art. 46).
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
- **Só para a demo:** o módulo `/demo-host` simula o back da LíderHub e não tem autenticação. Ele só existe com `DEMO_MODE=true`, só responde no computador do escritório (nunca pelo túnel; A01:2025), deixa passar apenas as rotas que a tela usa (nunca as de parceiro) e nunca deve ir para produção. Também só no modo demonstração, e só quando nenhum WhatsApp está configurado, o código do nível Reforçado volta para a tela de quem assina (`demoCode`), porque não há outro canal para entregá-lo. O túnel do compose deixa a demo pública enquanto roda (URL aleatória): rode `docker compose stop tunnel` depois de gravar.

## Próximos passos

- **Nível "Com selfie" completo:** Pix de R$ 0,01 vinculado ao CPF e comparação da selfie com a base oficial (Serpro Datavalid).
- **ICP-Brasil, lado da plataforma:** e-CNPJ ICP-Brasil no selo e carimbo do tempo de ACT credenciada, no lugar do certificado de demonstração e do FreeTSA. O código do selo já está pronto; falta contratar.
- **ICP-Brasil, lado de quem assina (assinatura qualificada):** integrar um certificado em nuvem (PSC, como BirdID ou VIDaaS) no passo de assinatura. Exige que o cliente tenha e-CPF, o que é raro no público de BPC/LOAS.
- **gov.br (assinatura avançada, gratuita):** o público de BPC já tem conta gov.br por causa do Meu INSS. A [API do ITI](https://www.gov.br/iti/pt-br/assuntos/assinatura-eletronica-avancada) hoje atende aplicações públicas; o ITI anunciou abertura a entidades privadas, sem data confirmada. Enquanto isso, dá para aceitar o PDF assinado no assinador do ITI e conferir a assinatura.
- **Várias plataformas:** uma chave de parceiro por plataforma (hoje só a da LíderHub), para outras integrarem do mesmo jeito.
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
