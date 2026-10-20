# LíderSign · Especificação técnica

Assinador eletrônico nativo da LíderHub. Três ideias guiam tudo:

1. **Zero configuração:** ativar é um clique dentro da LíderHub. Sem token, sem conta externa.
2. **WhatsApp primeiro:** o lead assina em 4 passos no celular, a partir da conversa que já existe.
3. **Feito para o juiz:** todo PDF sai selado (PAdES), com carimbo do tempo, página de evidências e QR de verificação pública.

## Arquitetura

```
apps/web          React + Vite: /demo, /painel, /s/:token (assinatura), /v/:code (verificação)
apps/api          NestJS: parceiro, modelos, envelopes, assinatura, selagem, webhooks, SSE
                  + serve o build do React e o módulo /demo-host (só na demo)
packages/shared   Contrato: schemas zod, DTOs, utilitários (CPF, telefone, modelos)
packages/agent    Mastra: IA que transforma contrato em modelo + servidor MCP
```

- Mesma stack da LíderHub (React + Nest, TypeScript ponta a ponta). Em produção é um processo só: o Nest serve a API e o site na mesma porta, então basta um container e um túnel para abrir o link no celular.
- O navegador nunca recebe a chave de parceiro. Na demo, o módulo `/demo-host` faz o papel do back da LíderHub: guarda a chave, repassa as chamadas para `/v1` e recebe os webhooks.
- Banco: Postgres com Prisma (o Supabase também é Postgres: troca só a `DATABASE_URL`). Arquivos: disco local (`STORAGE_DIR`), atrás de uma interface (troca por S3 ou Supabase Storage).
- Tempo real: SSE do Nest (`/v1/events`).

## Autenticação

| Quem | Como |
| --- | --- |
| LíderHub (parceiro) | `Authorization: Bearer <PARTNER_API_KEY>` + `X-Tenant-Id: <externalId do escritório>` |
| Signatário | Token aleatório de 32 bytes no link (`/s/<token>`); no banco só o SHA-256. Código de 6 dígitos no WhatsApp antes de assinar |
| Público | Código de verificação (`/v/<code>`), com dados mascarados |

O escritório nunca vê token. A LíderHub guarda uma chave de parceiro e identifica o escritório pelo próprio id dela (modelo "Stripe Connect").

## Endpoints da API (`/v1`)

### Parceiro (só Bearer)
| Método | Rota | Retorno |
| --- | --- | --- |
| POST | `/partner/tenants` | `ConnectTenantResponse` (201 criou, 200 já existia; idempotente, reativa) |
| GET | `/partner/tenants/:externalId` | `TenantDto` |
| GET | `/partner/tenants/:externalId/webhook-secret` | `{ webhookSecret }` |
| DELETE | `/partner/tenants/:externalId` | 204, desativa |

### Escritório (Bearer + X-Tenant-Id)
| Método | Rota | Retorno |
| --- | --- | --- |
| GET | `/templates` | `TemplateDto[]` |
| POST | `/templates` | `TemplateDto` |
| GET / PATCH / DELETE | `/templates/:id` | `TemplateDto` (PATCH sobe a versão; DELETE arquiva) |
| POST | `/templates/import` (multipart `file`: pdf, docx, txt, md; até 5 MB) | `TemplateImportResponse` (não salva) |
| GET | `/envelopes` | `EnvelopeDto[]` (mais novos primeiro, até 100) |
| POST | `/envelopes` | `EnvelopeDto` |
| GET | `/envelopes/:id` | `EnvelopeDetailDto` (trilha, mensagens, webhooks) |
| POST | `/envelopes/:id/resend` | `EnvelopeDto` |
| POST | `/envelopes/:id/cancel` | `EnvelopeDto` |
| GET | `/envelopes/:id/files/original` | PDF |
| GET | `/envelopes/:id/files/signed` | PDF selado (409 antes de concluir) |
| GET | `/envelopes/:id/files/timestamp` | `.tsr` (RFC 3161) |
| GET | `/events` | SSE de `StreamEvent` do escritório |

### Assinatura (público, por token; com limite de requisições)
| Método | Rota | Retorno |
| --- | --- | --- |
| GET | `/sign/:token` | `SigningSessionDto` (1º acesso marca VIEWED) |
| GET | `/sign/:token/document` | PDF original |
| POST | `/sign/:token/otp` | `{ sentTo, expiresInSeconds, resendInSeconds }` |
| POST | `/sign/:token/otp/verify` | `{ verified: true }` |
| POST | `/sign/:token/selfie` (multipart `selfie`) | `{ captured: true }` |
| POST | `/sign/:token/complete` | `{ status, verificationCode }` |
| GET | `/sign/:token/signed` | PDF selado (cópia do signatário) |

Erros: 404 token inválido · 410 expirado ou cancelado · 409 estado errado · 422 validação · 429 limite.

### Verificação pública
| Método | Rota | Retorno |
| --- | --- | --- |
| GET | `/public/verify/:code` | `PublicVerificationDto` (inclui `trailIntact`: a cadeia de hashes recalculada confere) |
| POST | `/public/verify/file` (multipart `file`) | `FileCheckResponse` (compara o SHA-256) |

### Demo (só com `DEMO_MODE=true`; Bearer + X-Tenant-Id)
| Método | Rota | Retorno |
| --- | --- | --- |
| GET | `/demo/messages` | `MessageDto[]` (caixa do simulador de WhatsApp) |
| POST | `/demo/reset` | 204, apaga o escritório de demo |

### Back da LíderHub simulado (só com `DEMO_MODE=true`, sem autenticação: nunca em produção)
| Método | Rota | Faz |
| --- | --- | --- |
| ALL | `/demo-host/v1/*` | Repassa para `/v1/*` com a chave de parceiro e o escritório de demo. Só `/templates`, `/envelopes`, `/events` e `/demo`; rotas de parceiro dão 404 |
| POST | `/demo-host/activate` | "Ativar LíderSign" em um clique |
| POST | `/demo-host/deactivate` | Desliga o switch (desativa o escritório de demo) |
| GET | `/demo-host/status` | `{ active, tenant, templatesCount, whatsappProvider }` |
| POST | `/demo-host/webhook` | Recebe os webhooks e confere o HMAC, como a LíderHub faria |
| GET | `/demo-host/webhooks` | Últimos 20 webhooks recebidos |

`GET /health` → `{ ok, db, whatsappProvider, tsa, ai }`

## Ciclo do envelope

```
SENT ──▶ VIEWED ──▶ SIGNED ──▶ COMPLETED
  └────────┴──▶ CANCELED / EXPIRED (7 dias; varredura a cada minuto, webhook envelope.expired)
```

1. **Criar** (`POST /envelopes`): valida variáveis, preenche o modelo, gera o PDF original, calcula o SHA-256, cria token e código de verificação, envia o link pelo WhatsApp, webhook `envelope.sent`.
2. **Abrir** (`GET /sign/:token`): VIEWED, webhook `envelope.viewed`.
3. **Código** (`POST /otp` e `/otp/verify`): 6 dígitos, validade de 10 min, 5 tentativas por código (reserva atômica), reenvio a cada 30 s, no máximo 5 códigos por documento. Guardado só o hash. O código e o token do link vão apenas para o WhatsApp do signatário: nas mensagens que o escritório vê (painel, SSE, banco) eles aparecem ocultos.
4. **Selfie** (só nível Reforçado).
5. **Assinar** (`POST /complete`): exige código verificado nos últimos 15 min; grava assinatura, aceite, IP, dispositivo e geolocalização consentida → SIGNED, webhook `envelope.signed`.
6. **Selar** (assíncrono): carimbo do tempo RFC 3161 sobre o SHA-256 do original · rodapé em todas as páginas · página de evidências com QR · selo PAdES (`ETSI.CAdES.detached`) com o certificado da plataforma → COMPLETED, cópia ao signatário pelo WhatsApp, webhook `envelope.completed`.

Se o carimbo falhar, o selo sai mesmo assim com `timestampStatus = FAILED` registrado na trilha (nunca um PDF sem selo).

## Webhooks

`POST <webhookUrl>` com `WebhookPayload` e cabeçalho `X-LiderSign-Signature: t=<unix>,v1=<hex>`, onde `v1 = HMAC-SHA256(webhookSecret, "<t>.<corpo>")`. Até 3 tentativas. Só para hosts em `WEBHOOK_ALLOWED_HOSTS`.

## MCP (para o Assistente e os agentes da LíderHub)

As mesmas 4 operações que o modal da ZapSign promete "em breve":

| Ferramenta | Faz |
| --- | --- |
| `listar_modelos` | Lista os modelos do escritório |
| `ver_campos_do_modelo` | Mostra as variáveis que o modelo pede |
| `criar_documento_para_assinar` | Cria o envelope e manda o link pelo WhatsApp |
| `ver_status_do_documento` | Status, trilha e link de verificação |

## Fora do escopo do desafio (próximos passos)

Pix de R$ 0,01 e biometria (Datavalid) no nível Reforçado · assinatura gov.br · carimbo do tempo embutido na assinatura (PAdES-B-T) · e-CNPJ e ACT ICP-Brasil · fila dedicada (BullMQ) · login do painel (na LíderHub ele vive dentro da plataforma).
