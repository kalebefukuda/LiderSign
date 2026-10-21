# LíderSign

Assinador eletrônico nativo da LíderHub: o escritório ativa com um clique, o cliente assina pelo WhatsApp e o advogado recebe um PDF selado, pronto para o processo.

> Projeto de demonstração para o desafio técnico da LíderHub. Modelos de contrato, escritório e cliente são fictícios.

![LíderSign](apps/web/public/og.png)

## O problema

- **Configurar é difícil.** Para usar um assinador externo, cada escritório precisa de conta, plano com API e um token. O advogado precisa saber o que é uma API e onde pegar a chave.
- **Custo e dependência.** Cada escritório paga um plano em outra plataforma, e a jornada do contrato sai da LíderHub.
- **Prova fraca em litígio de massa.** Algumas varas questionam procurações assinadas em plataformas privadas. A [Recomendação CNJ 159/2024](https://www.tjac.jus.br/wp-content/uploads/2024/11/SEI_2007215_Recomendacao_159.pdf) lista a procuração com assinatura não qualificada como indício de litigância abusiva. Por outro lado, o [STJ (REsp 2.223.695)](https://www.migalhas.com.br/quentes/451530/stj-procuracao-eletronica-nao-precisa-de-certificacao-da-icp-brasil) aceita procuração sem ICP-Brasil quando há mecanismos confiáveis de autoria e integridade. O problema não é a marca do assinador: é a força da prova.

## A proposta: três ideias

|                       | Como                                                                                                       | Na prática                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Zero configuração** | A LíderHub usa uma chave de parceiro e cria a conta do escritório sozinha                                  | Um clique em Integrações. Sem token, sem conta externa, sem senha    |
| **WhatsApp primeiro** | O link chega na conversa que já existe; o cliente confirma o CPF e assina                                  | 3 passos no celular, o PDF de verdade na tela, letra maior e "Ouvir" |
| **Feito para o juiz** | Selo PAdES, carimbo do tempo RFC 3161, página de evidências, trilha com hash encadeado e QR de verificação | O juiz confere a autenticidade pelo código ou enviando o arquivo     |

## Rodar em um comando

Precisa só do Docker.

```bash
docker compose up --build
```

Sobem dois sistemas separados, como seria na vida real. Eles só conversam pela API e por webhooks:

| Endereço                  | O que é                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------- |
| **http://localhost:3001** | **LíderHub (simulação):** onde o escritório trabalha. Comece por aqui                         |
| http://localhost:3000     | **LíderSign:** o produto. Painel do escritório, assinatura pelo celular e verificação pública |

1. **Integrações:** no card do LíderSign, clique em **Ativar**. É o único passo do escritório: sem conta, sem token, sem senha. Ao lado, a ZapSign mostra o caminho de hoje (conta, plano com API e token).
2. **Atendimento:** a conversa com a lead já está pronta. No painel do contato, coloque o **seu** celular em "WhatsApp da Maria" e clique em **Enviar para assinatura**. O servidor da LíderHub manda o modelo e os dados do contato; o LíderSign gera o PDF e o link sai na conversa.
3. **Assinar no celular:** toque em **Abrir no meu WhatsApp** (ou aponte a câmera para o QR), abra o link, digite o CPF da lead (`529.982.247-25`), confira o contrato e toque em **Assinar**.
4. **O status volta para a conversa:** "Maria abriu", "Maria assinou" e o PDF assinado, sem sair da LíderHub. Quem avisa é o webhook do LíderSign, conferido com HMAC.
5. **Contratos, sem sair da LíderHub:** a aba nova lista os contratos com filtro, busca, PDF e atalho para a conversa. Em **Modelos**, as telas do LíderSign aparecem embutidas, já logadas.
6. **Abrir o LíderSign:** o painel abre já logado, por um link de uso único. Lá estão:
    - **Início:** assinados no mês, taxa de assinatura, tempo médio até assinar e quem está parado há mais de 2 dias, com **Reenviar link**.
    - **Documentos:** filtros por status, modelo e período, e busca por cliente ou código.
    - **Modelos:** o escritório sobe o contrato dele (Word ou PDF) e a IA marca os campos.
    - **Configurações:** logo e cor do escritório no link de assinatura, validade do link e lembrete automático pelo WhatsApp.
    - **Desenvolvedores:** a conexão, cada webhook enviado (com reenvio) e as rotas da API.

Para a LíderHub de verdade, são dois caminhos: embutir as telas do LíderSign (prontas, com entrada sem senha) ou fazer as telas no visual dela usando a mesma API, que já devolve contratos, status, PDFs e modelos.

### Quem faz o quê

| Quem                | Onde          | O que faz                                                                                                   |
| ------------------- | ------------- | ----------------------------------------------------------------------------------------------------------- |
| Escritório          | LíderHub      | Ativa o LíderSign uma vez e envia contratos pelas conversas (ou o agente de IA envia)                       |
| Cliente             | Celular       | Recebe o link no WhatsApp, vê o logo do escritório, confirma o CPF, confere o PDF e assina. Nunca vê painel |
| LíderHub            | Servidor dela | Fala com o LíderSign pela API (chave de parceiro), recebe os avisos por webhook e abre o painel sem senha   |
| Painel do LíderSign | Bastidor      | Indicadores, documentos, modelos, marca e webhooks. Abre de vez em quando, sempre a partir da LíderHub      |

O link abre em qualquer celular porque o `docker compose` sobe junto um túnel HTTPS da Cloudflare (sem conta) e o LíderSign usa o endereço dele nos links. O túnel aponta só para o LíderSign: a simulação da LíderHub fica no seu computador, e o painel só abre com a sessão criada pela LíderHub. `docker compose stop tunnel` desliga o túnel.

**Para quem avalia o código:** na LíderHub, **Docs da integração** ([localhost:3001/docs](http://localhost:3001/docs)) mostra o caminho de um contrato, o registro ao vivo de cada chamada e webhook (com o HMAC conferido) e o comando do MCP.

Não precisa de conta de WhatsApp nem de chave de IA: tudo tem um modo local.

## Desenvolvimento

Requisitos: Node 22, pnpm 10 (`corepack enable`) e um Postgres 16.

```bash
# Postgres local (se não tiver um)
docker run -d --name lidersign-db -p 5432:5432 \
  -e POSTGRES_USER=lidersign -e POSTGRES_PASSWORD=lidersign -e POSTGRES_DB=lidersign postgres:16-alpine

cp .env.example .env
pnpm install
pnpm build          # shared, agent, web, api e a simulação da LíderHub
pnpm db:migrate
pnpm dev            # LíderSign: Nest :4000 + Vite :3000 · LíderHub: servidor :4001 + Vite :3001
```

Abra http://localhost:3001. Sem o túnel, os links usam `WEB_PUBLIC_URL` e abrem só neste computador. Em desenvolvimento, o Vite do LíderSign faz proxy de `/v1`, `/entrar` e `/health` para o Nest, e o da LíderHub, de `/api` para o servidor dela.

### Variáveis de ambiente

No Docker tudo já vem com valores de demonstração; o `.env` (copiado do `.env.example`) só serve para trocar algum.

| Variável                                                                                     | Para quê                                                                               |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `APP_PORT`, `LIDERHUB_PORT`                                                                  | Portas do LíderSign (3000) e da LíderHub (3001) no seu computador (Docker)             |
| `DATABASE_URL`                                                                               | Postgres                                                                               |
| `PORT`                                                                                       | Porta do Nest (4000 em desenvolvimento, 3000 no Docker)                                |
| `PARTNER_API_KEY`                                                                            | Chave de parceiro da LíderHub. Gere com `openssl rand -hex 32`                         |
| `WEB_PUBLIC_URL`                                                                             | Endereço dos links quando o túnel não está no ar                                       |
| `TUNNEL_METRICS_URL`                                                                         | Métricas do cloudflared; no Docker, os links usam a URL HTTPS do túnel. Vazio desliga  |
| `WEB_DIST_DIR`                                                                               | Build do React servido pelo Nest (vazio = `apps/web/dist`)                             |
| `STORAGE_DIR`, `CERT_DIR`                                                                    | Onde ficam os PDFs e o certificado de selagem                                          |
| `SEAL_CERT_PASSPHRASE`                                                                       | Senha do certificado de selagem (em produção, e-CNPJ no cofre)                         |
| `TSA_URL`                                                                                    | Carimbo do tempo RFC 3161. Vazio desliga                                               |
| `TRUST_PROXY`                                                                                | Saltos de proxy confiáveis para o IP do cliente (vazio = só loopback)                  |
| `WEBHOOK_ALLOWED_HOSTS`                                                                      | Hosts que podem receber webhooks (proteção contra SSRF)                                |
| `SESSION_SECRET`                                                                             | Assina o cookie do painel (vazio = derivado da chave de parceiro; em produção, defina) |
| `PARTNER_NAME`, `PARTNER_APP_URL`                                                            | Nome e endereço da plataforma parceira, para os atalhos "Voltar para a LíderHub"       |
| `EMBED_ALLOWED_ORIGINS`                                                                      | Quem pode embutir as telas do LíderSign num iframe (`frame-ancestors`)                 |
| `WHATSAPP_PROVIDER`                                                                          | `simulator` (padrão) ou `cloud_api`                                                    |
| `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_API_VERSION`                  | WhatsApp oficial da Meta                                                               |
| `ANTHROPIC_API_KEY`, `AI_MODEL`                                                              | IA que transforma contrato em modelo (opcional; sem chave usa regras locais)           |
| `DEMO_MODE`, `DEMO_TENANT_ID`                                                                | Modo demonstração e o escritório de exemplo                                            |
| `LIDERSIGN_API_URL`, `LIDERSIGN_TENANT_ID`                                                   | Onde a LíderHub e o servidor MCP encontram a API do LíderSign                          |
| `LIDERSIGN_PUBLIC_URL`                                                                       | Endereço do LíderSign no navegador (para abrir o painel e embutir os modelos)          |
| `LIDERHUB_SERVER_PORT`, `LIDERHUB_OFFICE_ID`, `LIDERHUB_OFFICE_NAME`, `LIDERHUB_WEBHOOK_URL` | Simulação da LíderHub: porta, escritório de exemplo e onde ela recebe os webhooks      |

### Testes

```bash
pnpm e2e            # com os dois apps no ar; outras URLs: E2E_BASE_URL e E2E_LIDERHUB_URL
```

Cinco testes ponta a ponta, com os dois apps separados: ativa o LíderSign na LíderHub, envia pela conversa, assina pelo celular (viewport de 390 px) só com o CPF e vê o status e o PDF voltarem; confere que o painel só abre com o link de uso único (e que ele não serve duas vezes) e que um POST sem o cabeçalho do app é recusado; gera o contrato, espera o PDF selado, confere o arquivo na verificação pública e rejeita uma cópia alterada; exige código e selfie na procuração; e aplica a marca do escritório no link (recusando cor ilegível e arquivo que não é imagem). Roda no GitHub Actions a cada push.

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

Depois é só pedir: _"Gere o contrato de honorários da Maria Aparecida dos Santos com o modelo BPC/LOAS e mande para o WhatsApp dela."_ Detalhes em [packages/agent/README.md](packages/agent/README.md).

## Como funciona

```
apps/web             LíderSign · React + Vite: painel do escritório, assinatura e verificação
apps/api             LíderSign · NestJS: API, selagem do PDF, webhooks e tempo real; serve o site
apps/liderhub-demo   Simulação da LíderHub · Express + React: só fala com o LíderSign pela API
packages/shared      Contrato entre as partes: schemas zod, tipos e utilitários
packages/ui          Componentes de interface usados pelos dois apps
packages/agent       Mastra: servidor MCP e IA que transforma contrato em modelo
```

Mesma stack da LíderHub: React, Nest e TypeScript de ponta a ponta. O Nest serve a API e o site do LíderSign na mesma porta: um container, uma URL. A simulação da LíderHub é outro container, com a chave de parceiro guardada só no servidor dela. O banco é Postgres (o Supabase também é: troca só a `DATABASE_URL`).

Rotas, ciclo do envelope e formato dos webhooks: [docs/spec.md](docs/spec.md). Decisões: [docs/adr](docs/adr).

### O que vai no PDF assinado

- O documento original, com um rodapé de verificação em todas as páginas.
- **Bloco de assinatura no fim do contrato:** já vem no PDF que o cliente lê (linha, nome, papel e CPF mascarado). Na selagem, a assinatura (nome em letra cursiva ou o desenho) entra ali, com data, hora e código.
- **Página de evidências:** signatário (CPF mascarado), como foi identificado (CPF digitado, link pessoal no WhatsApp e, no nível com selfie, código e selfie), assinatura, IP, dispositivo, aceite, SHA-256 do original, carimbo do tempo, trilha de auditoria e QR de verificação.
- **Selo PAdES** (`ETSI.CAdES.detached`) com o certificado da plataforma: qualquer alteração no arquivo invalida o selo.
- **Carimbo do tempo RFC 3161** sobre o hash do original, baixável como `.tsr` e verificável com `openssl ts -verify`.

Dois níveis de garantia, escolhidos no modelo (nunca a cada envio):

| Nível      | Autenticação                                                               | Uso                                           |
| ---------- | -------------------------------------------------------------------------- | --------------------------------------------- |
| Padrão     | Link pessoal no WhatsApp + CPF digitado por quem assina + IP e dispositivo | Contratos de honorários e propostas           |
| Com selfie | Padrão + código no WhatsApp + selfie                                       | Procurações e declarações em litígio de massa |

> Pesquisa usada para orientar o produto, não é parecer jurídico. Validar com especialista antes de uso com clientes.

## Segurança e LGPD

- **A01/A07:2025:** a chave de parceiro fica só no servidor (comparação em tempo constante). O link de assinatura é um token aleatório de 32 bytes, e o banco guarda só o hash. O código de 6 dígitos vale 10 minutos, permite 5 tentativas e também é guardado como hash.
- **A01/A07:2025:** o link sozinho não abre o contrato: o signatário digita o próprio CPF (5 tentativas por link, reserva atômica) antes de ver o texto ou o PDF (LGPD art. 46).
- **A07:2025:** o código e o token do link vão só para o WhatsApp do signatário. O escritório vê as mensagens com esses valores ocultos, e no banco eles nem chegam. Limite atômico de tentativas e no máximo 5 códigos por documento.
- **A01:2025 (SSRF):** webhooks só para hosts permitidos (`WEBHOOK_ALLOWED_HOSTS`), assinados com HMAC-SHA256.
- **A04:2025:** segredos só em variáveis de ambiente. Em produção, o certificado e-CNPJ fica num cofre.
- **A05:2025:** toda entrada é validada com zod, e os uploads são conferidos pelos bytes iniciais, não pela extensão.
- **A08/A09:2025:** o documento fica imutável depois do envio. A trilha de auditoria é append-only e cada evento carrega o hash do anterior. A verificação pública recalcula a cadeia e mostra se ela confere.
- **A07:2025 (entrada no painel):** a LíderHub pede um link de uso único (`POST /v1/partner/tenants/:id/sessions`), que vale 2 minutos e fica guardado só como hash. Ao abrir, vira um cookie `HttpOnly`, `SameSite=Lax`, assinado com HMAC e válido por 8 horas. Escritório desativado perde o acesso na hora.
- **A01:2025 (CSRF e clickjacking):** com o cookie, qualquer escrita exige o cabeçalho `X-LiderSign-Client`, que outro site não consegue mandar. Só as origens de `EMBED_ALLOWED_ORIGINS` podem embutir as telas (`frame-ancestors`).
- **A05:2025:** o logo do escritório aceita só PNG ou JPG, conferido pelos bytes iniciais (SVG fica de fora), até 300 KB, servido com `nosniff`. A cor da marca precisa ter contraste com texto branco.
- **Também:** limite de requisições nas rotas públicas, no envio de logo e no reenvio de webhook, e cabeçalhos de segurança (helmet).
- **LGPD:**
    - CPF e telefone aparecem mascarados nas telas, nos logs e na verificação pública (art. 6º, III).
    - A selfie, que é dado biométrico, só é pedida no nível Reforçado, com aviso e consentimento (art. 11).
    - O escritório é o controlador e a LíderHub, a operadora.
- **Só para a demo:** a simulação da LíderHub não tem login (ela representa a LíderHub, que já tem o dela) e por isso não passa pelo túnel: fica só no seu computador. Também só no modo demonstração, e só quando nenhum WhatsApp está configurado, o código do nível com selfie volta para a tela de quem assina (`demoCode`), porque não há outro canal para entregá-lo. O túnel deixa o LíderSign público enquanto roda (URL aleatória): rode `docker compose stop tunnel` depois de gravar.

## Próximos passos

- **Nível "Com selfie" completo:** Pix de R$ 0,01 vinculado ao CPF e comparação da selfie com a base oficial (Serpro Datavalid).
- **ICP-Brasil, lado da plataforma:** e-CNPJ ICP-Brasil no selo e carimbo do tempo de ACT credenciada, no lugar do certificado de demonstração e do FreeTSA. O código do selo já está pronto; falta contratar.
- **ICP-Brasil, lado de quem assina (assinatura qualificada):** integrar um certificado em nuvem (PSC, como BirdID ou VIDaaS) no passo de assinatura. Exige que o cliente tenha e-CPF, o que é raro no público de BPC/LOAS.
- **gov.br (assinatura avançada, gratuita):** o público de BPC já tem conta gov.br por causa do Meu INSS. A [API do ITI](https://www.gov.br/iti/pt-br/assuntos/assinatura-eletronica-avancada) hoje atende aplicações públicas; o ITI anunciou abertura a entidades privadas, sem data confirmada. Enquanto isso, dá para aceitar o PDF assinado no assinador do ITI e conferir a assinatura.
- **Várias plataformas:** uma chave de parceiro por plataforma (hoje só a da LíderHub), para outras integrarem do mesmo jeito.
- **Carimbo do tempo embutido** na assinatura (PAdES-B-T), em vez de anexado ao dossiê.
- **Fila dedicada para a selagem**, com BullMQ.
- **Login próprio do painel**, para quem usar o LíderSign fora da LíderHub. Hoje a entrada é sempre pela plataforma parceira.
- **Chave de API por escritório**, para o escritório integrar os sistemas dele.
- **Sessões e links de entrada no Redis**, para rodar várias instâncias do LíderSign (hoje ficam na memória do processo).

## Como foi construído

O projeto foi construído com IA do começo ao fim:

1. Briefing a partir do vídeo do desafio.
2. Pesquisa jurídica e de mercado com fontes.
3. Contrato de API escrito antes do código, em `packages/shared` e `docs/spec.md`.
4. Agentes trabalhando em paralelo na API, no front e na infraestrutura, cada um validando o próprio trabalho com o fluxo real e capturas de tela.
5. Teste ponta a ponta no final.

Os bloqueios encontrados e como foram resolvidos estão em [docs/diario.md](docs/diario.md).
