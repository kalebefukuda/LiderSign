# LíderHub · Contratos · Especificação técnica

O módulo de contratos da LíderHub. Três ideias guiam tudo:

1. **Assinar na conversa:** o cliente assina dentro do WhatsApp (CPF digitado, PDF, resumo em áudio e botão Assinar). O link é o plano B.
2. **Um produto só:** nada de ativar, colar token ou abrir outro painel. Caixa de entrada, Contratos, Modelos e Assistente ficam na LíderHub.
3. **Feito para o juiz:** todo PDF sai selado (PAdES), com carimbo do tempo, página de evidências e QR de verificação pública.

## Arquitetura

```
apps/web          /entrar · /atendimento (Caixa de entrada + celular simulado) · /contratos · /contratos/:id
                  /modelos · /configuracoes · /s/:token (assinatura pelo navegador) · /v/:code (verificação)
apps/api          sessão, contatos, conversa de assinatura (simulador e webhook da Meta), envelopes, selagem,
                  lembretes, funil, Assistente, SSE; serve o build do React
packages/shared   Contrato: schemas zod, DTOs, funil, utilitários (CPF, telefone, contraste de cor, modelos)
packages/ui       Componentes e utilitários de interface
packages/agent    Mastra: IA que transforma contrato em modelo + servidor MCP
```

- Mesma stack da LíderHub (React + Nest, TypeScript ponta a ponta). Um processo: o Nest serve a API e o site na mesma porta.
- **Conversa de assinatura:** `ConversationService` (`apps/api/src/whatsapp`) é uma máquina de estados por envelope (`conversationState`). Entra mensagem pelo simulador (demo) ou pelo webhook da Meta; sai pelo provedor (`simulator` ou `cloud_api`).
- **Mensagens ricas:** `Message` tem `direction` (OUT/IN), `type` (TEXT, BUTTONS, DOCUMENT, AUDIO, IMAGE) e `payload` (botões, documento, áudio, autor).
- Banco: Postgres com Prisma (o Supabase também é Postgres). Arquivos: disco local (`STORAGE_DIR`), atrás de uma interface.
- Tempo real: SSE do Nest (`/v1/events`) com `envelope.updated`, `message.created` e `contacts.updated`.

## Autenticação

| Quem                       | Como                                                                                                                                                                                |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Equipe do escritório       | Cookie `ls_session` (HttpOnly, SameSite=Lax, HMAC, 8 h). Na demo, criado por `POST /v1/session/demo` (só `DEMO_MODE` e só conexão local). Escritas exigem `X-LiderSign-Client: web` |
| Serviço (MCP, integrações) | `Authorization: Bearer <PARTNER_API_KEY>` + `X-Tenant-Id: <externalId do escritório>`                                                                                               |
| Cliente na conversa        | Posse do número de WhatsApp + CPF digitado (5 tentativas, somadas com o link)                                                                                                       |
| Cliente no navegador       | Token aleatório de 32 bytes no link (`/s/<token>`, só o SHA-256 no banco) + CPF confirmado no próprio link                                                                          |
| Meta                       | `X-Hub-Signature-256` (HMAC-SHA256 do corpo cru com `WHATSAPP_APP_SECRET`)                                                                                                          |
| Público                    | Código de verificação (`/v/<code>`), com dados mascarados                                                                                                                           |

## Endpoints da API (`/v1`)

### Sessão

| Método | Rota                  | Retorno                                                                                   |
| ------ | --------------------- | ----------------------------------------------------------------------------------------- |
| GET    | `/session`            | `SessionInfoDto` `{ loginAvailable, officeName }`                                         |
| POST   | `/session/demo`       | 204 + cookie. 404 sem `DEMO_MODE`; 403 sem o cabeçalho do app ou fora do computador local |
| POST   | `/session/demo/reset` | 204, apaga e recria o escritório de demonstração (sessão)                                 |
| POST   | `/session/logout`     | 204, apaga o cookie                                                                       |

### Escritório (cookie, ou Bearer + X-Tenant-Id)

| Método             | Rota                                                                 | Retorno                                                                                                                                       |
| ------------------ | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| GET                | `/contacts`                                                          | `ContactDto[]` (última mensagem e último contrato)                                                                                            |
| GET                | `/contacts/:id/conversation`                                         | `ConversationDto`. `?view=client` mostra os links completos, só na demo. Documentos vêm com `url` de mídia assinada                           |
| POST               | `/contacts/:id/contracts`                                            | `SendContractInput` `{ templateId, channel: WHATSAPP \| LINK, phone? }` → `EnvelopeDto`. `phone` só na demo. 409 se já há contrato aguardando |
| POST               | `/contacts/:id/messages`                                             | `{ text }` → `MessageDto` (mensagem da equipe na conversa)                                                                                    |
| GET                | `/templates` · POST `/templates` · GET/PATCH/DELETE `/templates/:id` | `TemplateDto`                                                                                                                                 |
| POST               | `/templates/import` (multipart `file`)                               | `TemplateImportResponse` (não salva)                                                                                                          |
| GET                | `/envelopes` · `/envelopes/:id`                                      | `EnvelopeDto[]` · `EnvelopeDetailDto`                                                                                                         |
| POST               | `/envelopes`                                                         | `CreateEnvelopeInput` (com `channel`, padrão `LINK` para integrações) → `EnvelopeDto`                                                         |
| POST               | `/envelopes/:id/nudge`                                               | `EnvelopeDto`. Lembrete na conversa conforme a etapa (ou link novo, no canal LINK); 409 se lembrado há menos de 2 min                         |
| POST               | `/envelopes/:id/resend` · `/cancel`                                  | `EnvelopeDto`                                                                                                                                 |
| GET                | `/envelopes/:id/files/original` · `signed` · `timestamp`             | PDF · PDF selado · `.tsr`                                                                                                                     |
| GET                | `/contracts/imported`                                                | `ImportedContractDto[]` (histórico do ZapSign, exemplo determinístico)                                                                        |
| POST               | `/contracts/nudge-stalled`                                           | `{ count, names }` (lembra todos os parados)                                                                                                  |
| POST               | `/assistant`                                                         | `AssistantMessageInput` `{ message, page, history }` → `AssistantReply` `{ reply, actions, engine, thoughtMs, lookups, steps }`               |
| POST               | `/assistant/template` (multipart `file`)                             | `AssistantReply` com `template.created`                                                                                                       |
| GET                | `/events`                                                            | SSE de `StreamEvent`                                                                                                                          |
| GET                | `/office/me`                                                         | `OfficeMeDto` (escritório, configurações, WhatsApp, endereço dos links, `demo`, `aiEnabled`)                                                  |
| PATCH              | `/office/settings`                                                   | `OfficeSettingsDto` (cor com contraste 4,5:1, validade 1 a 30 dias, lembrete 24/48/72 h)                                                      |
| GET / PUT / DELETE | `/office/logo`                                                       | PNG ou JPG até 300 KB                                                                                                                         |
| POST               | `/office/whatsapp-test`                                              | `{ phone }` → `{ status, error, provider }`                                                                                                   |

### WhatsApp

| Método | Rota                          | Retorno                                                                                                                             |
| ------ | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/whatsapp/simulator`         | `SimulatorInboundInput` (`text`, `button` ou `image` com `contactId`) → 202. Só com `DEMO_MODE` e sessão                            |
| GET    | `/whatsapp/webhook`           | Verificação da Meta (`hub.verify_token` → `hub.challenge`)                                                                          |
| POST   | `/whatsapp/webhook`           | Mensagens da Meta (texto, `button_reply`, imagem). 404 sem `WHATSAPP_APP_SECRET`, 403 com assinatura inválida; deduplica pelo wamid |
| GET    | `/whatsapp/media/:id?exp&sig` | PDF de uma mensagem de documento (HMAC, 1 h)                                                                                        |

### Assinatura pelo navegador (público, por token)

| Método | Rota                                                         | Retorno                                                                                |
| ------ | ------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| GET    | `/sign/:token`                                               | `SigningSessionDto`. Até o CPF ser confirmado no link, `body` e `plainText` vêm vazios |
| POST   | `/sign/:token/identity`                                      | `{ cpf }` → `{ confirmed: true }`. Errou, 422; esgotou, 429                            |
| GET    | `/sign/:token/document` · `/logo` · `/signed`                | PDF · logo · PDF selado                                                                |
| POST   | `/sign/:token/otp` · `/otp/verify` · `/selfie` · `/complete` | Nível com selfie e conclusão                                                           |

### Verificação pública

| Método | Rota                   | Retorno                                     |
| ------ | ---------------------- | ------------------------------------------- |
| GET    | `/public/verify/:code` | `PublicVerificationDto` (com `trailIntact`) |
| POST   | `/public/verify/file`  | `FileCheckResponse` (compara o SHA-256)     |

### Serviço (só Bearer)

| Método       | Rota                           | Retorno                                                                    |
| ------------ | ------------------------------ | -------------------------------------------------------------------------- |
| POST         | `/partner/tenants`             | Cria ou reativa um escritório (provisionamento), com os modelos de exemplo |
| GET / DELETE | `/partner/tenants/:externalId` | `TenantDto` · 204                                                          |

`GET /health` → `{ ok, db, whatsappProvider, tsa, ai }`

## A conversa de assinatura

```
AWAITING_CPF ──▶ AWAITING_DECISION ⇄ AWAITING_QUESTION ──▶ [AWAITING_SELFIE] ──▶ SIGNED ──▶ DONE
      └──▶ BLOCKED
```

1. **Envio** (`POST /contacts/:id/contracts`, canal WHATSAPP): gera o PDF, o SHA-256 e o código de verificação, manda a saudação e o pedido de CPF. Trilha: `WHATSAPP_STARTED`.
2. **Primeira resposta:** marca VIEWED ("abriu").
3. **CPF:** conferido pelo hash (5 tentativas, reserva atômica). Gravado mascarado. Errou: diz quantas restam. Esgotou: BLOCKED, a equipe assume.
4. **Documento:** mensagem de documento (PDF por link de mídia), resumo em áudio (IA ou roteiro reserva) e botões **Assinar**, **Tenho uma dúvida** e **Ver no navegador**, com o texto do aceite.
5. **Dúvida:** a resposta usa só o contrato (IA com CPF mascarado, ou o trecho mais próximo do próprio texto). Volta aos botões. Trilha: `WHATSAPP_REPLY`.
6. **Ver no navegador:** gira o token e manda o link pessoal. No navegador, o CPF é pedido de novo.
7. **Assinar:** só pelo botão. No nível com selfie, pede a foto pela câmera do WhatsApp (conferida pelos bytes). Evidência: canal, número mascarado, id da mensagem do aceite, provedor (`simulator` sai marcado na página de evidências).
8. **Selagem** (assíncrona, igual ao link): carimbo RFC 3161, rodapé, página de evidências, selo PAdES → COMPLETED. A via assinada e o código de verificação voltam na conversa.

**Lembrete:** a cada 5 minutos, quem está sem assinar há `reminderAfterHours` recebe um lembrete uma vez (`remindedAt`, reserva atômica). Na conversa, o texto depende da etapa (CPF, dúvida ou selfie). Pelo link, vai um link novo. Manual: `POST /envelopes/:id/nudge` ou o Assistente.

## Funil

`packages/shared/src/funnel.ts`: cada contrato chega até uma etapa (`SENT` recebeu, `VIEWED` abriu ou respondeu, `IDENTITY` confirmou o CPF, `SIGNED` assinou). `summarizeFunnel` conta quantos chegaram pelo menos a cada etapa e a taxa de fechamento. Cancelados pelo escritório ficam fora. O histórico do ZapSign entra pelo mesmo cálculo (`importedEntry`).

## Ciclo do envelope

```
SENT ──▶ VIEWED ──▶ SIGNED ──▶ COMPLETED
  └────────┴──▶ CANCELED / EXPIRED (validade do escritório, 7 dias por padrão)
```

Se o carimbo falhar, o selo sai mesmo assim com `timestampStatus = FAILED` registrado na trilha (nunca um PDF sem selo).

## MCP

| Ferramenta                     | Faz                                                                         |
| ------------------------------ | --------------------------------------------------------------------------- |
| `listar_modelos`               | Lista os modelos do escritório                                              |
| `ver_campos_do_modelo`         | Mostra as variáveis que o modelo pede                                       |
| `criar_documento_para_assinar` | Cria o envelope e manda na conversa (`canal: conversa`, padrão) ou por link |
| `ver_status_do_documento`      | Status, trilha e link de verificação                                        |

## Fora do escopo do desafio (próximos passos)

Modelo aprovado da Meta para a primeira mensagem e para lembretes fora da janela de 24 h · áudio gerado no servidor · prova de vida na selfie e Datavalid · assinatura gov.br · PAdES-B-T · e-CNPJ e ACT ICP-Brasil · importação real do ZapSign · fila dedicada (BullMQ) e sessões no Redis.
