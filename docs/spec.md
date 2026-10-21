# LíderSign · Especificação técnica

Assinador eletrônico nativo da LíderHub. Três ideias guiam tudo:

1. **Zero configuração:** ativar é um clique dentro da LíderHub. Sem token, sem conta externa.
2. **WhatsApp primeiro:** o lead assina em 4 passos no celular, a partir da conversa que já existe.
3. **Feito para o juiz:** todo PDF sai selado (PAdES), com carimbo do tempo, página de evidências e QR de verificação pública.

## Arquitetura

```
apps/web             LíderSign: /painel (início, documentos, modelos, configurações, desenvolvedores), /s/:token (assinatura), /v/:code (verificação)
apps/api             LíderSign: parceiro, sessões do painel, modelos, envelopes, assinatura, selagem, webhooks, lembretes, SSE; serve o build do React
apps/liderhub-demo   Simulação da LíderHub (outro processo): Express guarda a chave de parceiro e recebe os webhooks; React com Atendimento, Contratos, Integrações e Docs
packages/shared      Contrato: schemas zod, DTOs, utilitários (CPF, telefone, contraste de cor, modelos)
packages/ui          Componentes e utilitários de interface dos dois apps
packages/agent       Mastra: IA que transforma contrato em modelo + servidor MCP
```

- Mesma stack da LíderHub (React + Nest, TypeScript ponta a ponta). O LíderSign é um processo só: o Nest serve a API e o site na mesma porta.
- **Dois sistemas, uma fronteira:** a simulação da LíderHub só fala com o LíderSign pela API (`/v1`, chave de parceiro no servidor dela) e recebe os avisos por webhook. O navegador da LíderHub nunca recebe a chave.
- **Entrada no painel sem senha:** a LíderHub pede `POST /v1/partner/tenants/:id/sessions` e manda o navegador para `/entrar?token=…`, que troca o link de uso único por um cookie de sessão. As telas de modelos também abrem embutidas (iframe) na LíderHub, com o mesmo mecanismo.
- O túnel do compose aponta só para o LíderSign. A simulação da LíderHub fica no computador.
- Banco: Postgres com Prisma (o Supabase também é Postgres: troca só a `DATABASE_URL`). Arquivos: disco local (`STORAGE_DIR`), atrás de uma interface (troca por S3 ou Supabase Storage).
- Tempo real: SSE do Nest (`/v1/events`) para o painel; na LíderHub, SSE próprio alimentado pelos webhooks.

## Autenticação

| Quem                 | Como                                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| LíderHub (parceiro)  | `Authorization: Bearer <PARTNER_API_KEY>` + `X-Tenant-Id: <externalId do escritório>`                                                                 |
| Escritório no painel | Cookie `ls_session` (HttpOnly, SameSite=Lax, HMAC, 8 h), criado em `/entrar` a partir do link de uso único. Escritas exigem `X-LiderSign-Client: web` |
| Signatário           | Token aleatório de 32 bytes no link (`/s/<token>`); no banco só o SHA-256. Código de 6 dígitos no WhatsApp antes de assinar                           |
| Público              | Código de verificação (`/v/<code>`), com dados mascarados                                                                                             |

O escritório nunca vê token. A LíderHub guarda uma chave de parceiro e identifica o escritório pelo próprio id dela (modelo "Stripe Connect").

## Endpoints da API (`/v1`)

### Parceiro (só Bearer)

| Método | Rota                                          | Retorno                                                                                                 |
| ------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| POST   | `/partner/tenants`                            | `ConnectTenantResponse` (201 criou, 200 já existia; idempotente, reativa)                               |
| GET    | `/partner/tenants/:externalId`                | `TenantDto`                                                                                             |
| GET    | `/partner/tenants/:externalId/webhook-secret` | `{ webhookSecret }`                                                                                     |
| POST   | `/partner/tenants/:externalId/sessions`       | `{ to? }` (caminho do painel) → `OfficeSessionResponse` `{ path, expiresAt }`: link de uso único, 2 min |
| DELETE | `/partner/tenants/:externalId`                | 204, desativa                                                                                           |

### Escritório (Bearer + X-Tenant-Id, ou o cookie do painel)

| Método               | Rota                                                                 | Retorno                                                                                                                                        |
| -------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| GET                  | `/templates`                                                         | `TemplateDto[]`                                                                                                                                |
| POST                 | `/templates`                                                         | `TemplateDto`                                                                                                                                  |
| GET / PATCH / DELETE | `/templates/:id`                                                     | `TemplateDto` (PATCH sobe a versão; DELETE arquiva)                                                                                            |
| POST                 | `/templates/import` (multipart `file`: pdf, docx, txt, md; até 5 MB) | `TemplateImportResponse` (não salva)                                                                                                           |
| GET                  | `/envelopes`                                                         | `EnvelopeDto[]` (mais novos primeiro, até 100)                                                                                                 |
| POST                 | `/envelopes`                                                         | `EnvelopeDto`                                                                                                                                  |
| GET                  | `/envelopes/:id`                                                     | `EnvelopeDetailDto` (trilha, mensagens, webhooks)                                                                                              |
| POST                 | `/envelopes/:id/resend`                                              | `EnvelopeDto`                                                                                                                                  |
| POST                 | `/envelopes/:id/cancel`                                              | `EnvelopeDto`                                                                                                                                  |
| GET                  | `/envelopes/:id/files/original`                                      | PDF                                                                                                                                            |
| GET                  | `/envelopes/:id/files/signed`                                        | PDF selado (409 antes de concluir)                                                                                                             |
| GET                  | `/envelopes/:id/files/timestamp`                                     | `.tsr` (RFC 3161)                                                                                                                              |
| GET                  | `/events`                                                            | SSE de `StreamEvent` do escritório                                                                                                             |
| GET                  | `/office/me`                                                         | `OfficeMeDto` (escritório, configurações, parceiro, WhatsApp, endereço dos links)                                                              |
| PATCH                | `/office/settings`                                                   | `UpdateOfficeSettingsInput` → `OfficeSettingsDto` (cor da marca com contraste mínimo 4,5:1, validade do link 1 a 30 dias, lembrete 24/48/72 h) |
| GET / PUT / DELETE   | `/office/logo`                                                       | PNG ou JPG até 300 KB (multipart `file`, conferido pelos bytes)                                                                                |
| GET                  | `/office/webhooks`                                                   | `WebhookDeliveryDto[]` (últimos 50)                                                                                                            |
| POST                 | `/office/webhooks/:id/retry`                                         | 202, reenvia o mesmo evento (mesmo `id` do payload)                                                                                            |
| POST                 | `/office/whatsapp-test`                                              | `{ phone }` → `{ status, error, provider }`                                                                                                    |
| POST                 | `/office/logout`                                                     | 204, apaga o cookie                                                                                                                            |

Fora de `/v1`: `GET /entrar?token&to` troca o link de uso único pelo cookie e redireciona para `to` (só caminhos `/painel…`). Link usado ou vencido vai para `/painel?acesso=expirado`.

### Assinatura (público, por token; com limite de requisições)

| Método | Rota                                       | Retorno                                                                                                                                              |
| ------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/sign/:token`                             | `SigningSessionDto` (1º acesso marca VIEWED). Até o CPF ser confirmado, `body` e `plainText` vêm vazios                                              |
| POST   | `/sign/:token/identity`                    | `{ cpf }` → `{ confirmed: true }`. 5 tentativas por link (reserva atômica); errou, 422; esgotou, 429                                                 |
| GET    | `/sign/:token/document`                    | PDF original (409 antes do CPF)                                                                                                                      |
| GET    | `/sign/:token/logo`                        | Logo do escritório (a sessão traz `branding: { color, hasLogo }`)                                                                                    |
| POST   | `/sign/:token/otp`                         | `{ sentTo, expiresInSeconds, resendInSeconds, demoCode? }` (só depois do CPF; `demoCode` só com `DEMO_MODE=true` e WhatsApp em modo de demonstração) |
| POST   | `/sign/:token/otp/verify`                  | `{ verified: true }`                                                                                                                                 |
| POST   | `/sign/:token/selfie` (multipart `selfie`) | `{ captured: true }`                                                                                                                                 |
| POST   | `/sign/:token/complete`                    | `{ status, verificationCode }`                                                                                                                       |
| GET    | `/sign/:token/signed`                      | PDF selado (cópia do signatário)                                                                                                                     |

Erros: 404 token inválido · 410 expirado ou cancelado · 409 estado errado · 422 validação · 429 limite.

### Verificação pública

| Método | Rota                                     | Retorno                                                                                |
| ------ | ---------------------------------------- | -------------------------------------------------------------------------------------- |
| GET    | `/public/verify/:code`                   | `PublicVerificationDto` (inclui `trailIntact`: a cadeia de hashes recalculada confere) |
| POST   | `/public/verify/file` (multipart `file`) | `FileCheckResponse` (compara o SHA-256)                                                |
| GET    | `/public/partner`                        | `{ name, url }` da plataforma parceira, para a tela "Entre pela LíderHub"              |

### Demo (só com `DEMO_MODE=true`; Bearer + X-Tenant-Id)

| Método | Rota             | Retorno                                                                    |
| ------ | ---------------- | -------------------------------------------------------------------------- |
| GET    | `/demo/messages` | `MessageDto[]` (mensagens do modo demonstração, com código e link ocultos) |
| POST   | `/demo/reset`    | 204, apaga o escritório de demo                                            |

### Simulação da LíderHub (`apps/liderhub-demo`, outro processo)

Rotas do servidor dela (`/api`), chamadas só pelo navegador da LíderHub. Escritas exigem `X-LiderHub-Client: web`.

| Método | Rota                                                       | Faz                                                                                                                                               |
| ------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/status`                                              | Escritório ativo no LíderSign e quantos modelos tem                                                                                               |
| POST   | `/api/lidersign/activate` · `/deactivate`                  | `POST` e `DELETE /v1/partner/tenants` (o botão de Integrações)                                                                                    |
| GET    | `/api/lidersign/open?to=/painel/...`                       | Pede o link de uso único e redireciona para o LíderSign                                                                                           |
| GET    | `/api/templates` · `/api/contracts` · `/api/contracts/:id` | Repassa da API do LíderSign                                                                                                                       |
| POST   | `/api/contracts`                                           | `{ contactId, templateId, phone }`: monta as variáveis com os dados do contato e do escritório (que são da LíderHub) e chama `POST /v1/envelopes` |
| GET    | `/api/contracts/:id/pdf`                                   | PDF assinado                                                                                                                                      |
| POST   | `/api/webhooks/lidersign`                                  | Recebe os webhooks e confere o HMAC (401 se não confere)                                                                                          |
| GET    | `/api/events`                                              | SSE para a tela da LíderHub, alimentado pelos webhooks                                                                                            |
| GET    | `/api/calls` · `/api/webhooks`                             | Registro da integração (em memória)                                                                                                               |
| POST   | `/api/reset`                                               | Apaga o escritório de demonstração (`POST /v1/demo/reset`)                                                                                        |

`GET /health` → `{ ok, db, whatsappProvider, tsa, ai }`

## Ciclo do envelope

```
SENT ──▶ VIEWED ──▶ SIGNED ──▶ COMPLETED
  └────────┴──▶ CANCELED / EXPIRED (validade do escritório, 7 dias por padrão; varredura a cada minuto, webhook envelope.expired)
```

1. **Criar** (`POST /envelopes`): valida variáveis, preenche o modelo, gera o PDF original, calcula o SHA-256, cria token e código de verificação, envia o link pelo WhatsApp, webhook `envelope.sent`.
2. **Abrir** (`GET /sign/:token`): VIEWED, webhook `envelope.viewed`. Mostra só o nome do escritório, o título e o primeiro nome.
3. **CPF** (`POST /identity`): o signatário digita o próprio CPF; só então o texto e o PDF ficam disponíveis. Assim, um link encaminhado não expõe o contrato.
4. **Código** (só nível Reforçado; `POST /otp` e `/otp/verify`): 6 dígitos, validade de 10 min, 5 tentativas por código (reserva atômica), reenvio a cada 30 s, no máximo 5 códigos por documento. Guardado só o hash. O código e o token do link vão apenas para o WhatsApp do signatário: nas mensagens que o escritório vê (painel, SSE, banco) eles aparecem ocultos.
5. **Selfie** (só nível Reforçado).
6. **Assinar** (`POST /complete`): exige CPF confirmado e, no Reforçado, código verificado nos últimos 15 min e selfie; grava assinatura, aceite por clique ("Ao tocar em Assinar..."), IP e dispositivo → SIGNED, webhook `envelope.signed`.
7. **Selar** (assíncrono): carimbo do tempo RFC 3161 sobre o SHA-256 do original · rodapé em todas as páginas · página de evidências com QR · selo PAdES (`ETSI.CAdES.detached`) com o certificado da plataforma → COMPLETED, cópia ao signatário pelo WhatsApp, webhook `envelope.completed`.

**Lembrete:** a cada 5 minutos, documentos ainda sem assinatura depois de `reminderAfterHours` (24 h por padrão) recebem um lembrete pelo WhatsApp, uma vez só (`remindedAt`, reserva atômica). O lembrete leva um link novo e o anterior deixa de valer (o token é guardado só como hash). Fica na trilha como `REMINDER_SENT`.

Se o carimbo falhar, o selo sai mesmo assim com `timestampStatus = FAILED` registrado na trilha (nunca um PDF sem selo).

## Webhooks

`POST <webhookUrl>` com `WebhookPayload` e cabeçalho `X-LiderSign-Signature: t=<unix>,v1=<hex>`, onde `v1 = HMAC-SHA256(webhookSecret, "<t>.<corpo>")`. Até 3 tentativas. Só para hosts em `WEBHOOK_ALLOWED_HOSTS`. Cada entrega fica registrada e pode ser reenviada pelo painel (Desenvolvedores) ou por `POST /v1/office/webhooks/:id/retry`; o reenvio mantém o `id` do evento, para o receptor descartar duplicados.

## MCP (para o Assistente e os agentes da LíderHub)

As mesmas 4 operações que o modal da ZapSign promete "em breve":

| Ferramenta                     | Faz                                          |
| ------------------------------ | -------------------------------------------- |
| `listar_modelos`               | Lista os modelos do escritório               |
| `ver_campos_do_modelo`         | Mostra as variáveis que o modelo pede        |
| `criar_documento_para_assinar` | Cria o envelope e manda o link pelo WhatsApp |
| `ver_status_do_documento`      | Status, trilha e link de verificação         |

## Fora do escopo do desafio (próximos passos)

Pix de R$ 0,01 e biometria (Datavalid) no nível Reforçado · assinatura gov.br · carimbo do tempo embutido na assinatura (PAdES-B-T) · e-CNPJ e ACT ICP-Brasil · fila dedicada (BullMQ) · login próprio do painel (hoje a entrada é pela plataforma parceira) · chave de API por escritório · sessões e links de entrada no Redis, para várias instâncias.
