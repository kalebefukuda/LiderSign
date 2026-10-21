# CLAUDE.md

Guia para agentes (Claude Code) trabalharem neste repositório.

## O que é

Módulo de contratos da LíderHub (automação de atendimento por WhatsApp para escritórios de advocacia): o cliente assina dentro da conversa do WhatsApp, e o escritório acompanha pela Caixa de entrada, pelo funil em Contratos e pelo Assistente. O repositório se chama LíderSign por histórico; na interface o nome é LíderHub. Visão do produto no README; contrato técnico em `docs/spec.md`; decisões em `docs/adr/` (a ADR 005 explica o produto único).

## Estrutura

```
apps/api            NestJS 11 + Prisma 6 (Postgres). Serve também o build do React.
                    whatsapp/ conversa de assinatura (máquina de estados) · contacts/ · assistant/ · contracts/ (funil, ZapSign)
apps/web            React 19 + Vite 7 + React Router 7 + Tailwind 4 (a LíderHub: inbox, contratos, modelos, assistente)
packages/shared     Schemas zod, DTOs, funil e utilitários usados por todos (CommonJS)
packages/ui         Componentes de interface e utilitários (código-fonte, sem build)
packages/agent      Mastra: servidor MCP + extrator de modelos com IA (ESM)
e2e/                Playwright: fluxo completo
infra/              entrypoint do Docker e guia do túnel
```

## Comandos

```bash
pnpm install
pnpm build                                 # shared → agent → web → api
pnpm dev                                   # Nest :4000 + Vite :3000
pnpm db:migrate                            # prisma migrate deploy
pnpm --filter @lidersign/api typecheck
pnpm --filter @lidersign/web typecheck
pnpm e2e                                   # precisa do app no ar (E2E_BASE_URL, padrão :3000)
docker compose up --build                  # http://localhost:3000 · Entrar no escritório (só no computador local)
```

Mudou `packages/shared`? Rode `pnpm --filter @lidersign/shared build` antes de compilar api ou web.

## Regras do projeto

- **Contrato primeiro:** rota nova ou campo novo nasce em `packages/shared` (schema zod + DTO) e em `docs/spec.md`, e só depois na API e no front.
- **O navegador nunca recebe a chave de serviço** (`PARTNER_API_KEY`, só para MCP e integrações). A equipe usa o cookie de sessão; toda escrita com cookie manda `X-LiderSign-Client: web`. Rotas públicas: só `/v1/sign/:token`, `/v1/public/*`, `/v1/session` (GET), `/v1/whatsapp/webhook` (com HMAC da Meta) e `/v1/whatsapp/media/:id` (link assinado).
- **Demonstração não vaza para produção:** a entrada sem senha e o celular simulado só existem com `DEMO_MODE`, e a entrada só aceita conexão local. Assinatura feita no simulador sai marcada nas evidências.
- **Aceite só pelo botão** na conversa; o CPF digitado nunca é gravado por inteiro; o link do plano B pede o CPF de novo no navegador.
- **IA com dado mínimo:** para o Claude vão nome abreviado, título e etapa; contrato com CPF mascarado. Ferramenta que age fora do app (lembrete) só roda com pedido explícito. Sempre há roteiro reserva sem chave.
- **Dados pessoais:** CPF e telefone sempre mascarados em DTO, tela e log (`maskCpf`, `maskPhone`). Nunca logar token, código de confirmação, CPF ou telefone em claro.
- **Documento imutável:** depois do envio, o PDF original não muda. Toda ação relevante vira evento na trilha (`AuditService.append`), com hash encadeado.
- **Selagem:** nunca marcar COMPLETED sem o PDF selado. Falha no carimbo do tempo é registrada na trilha, mas não impede o selo.
- **Segredos:** só em variáveis de ambiente (`.env` nunca versionado). Use `.env.example` para documentar.
- **Uploads:** conferir pelos bytes iniciais (magic bytes), limite de 5 MB.

## Estilo

- Prettier: 4 espaços, sem ponto e vírgula, aspas simples (`pnpm format`).
- Identificadores em inglês; textos de interface, comentários e docs em português do Brasil.
- **Não use travessão (—) em textos:** prefira vírgula, dois-pontos ou "·".
- Front: features em `src/features/<feature>` com barrel (`index.ts`); rotas finas em `src/routes`; primitivos em `packages/ui`. Estados de carregando, vazio e erro sempre desenhados.
- Visual: segue o padrão da LíderHub (menu lateral cinza, conteúdo num cartão com borda, painel de contato com seções em caixa alta, notas internas em âmbar, Assistente à direita). Sóbrio, um acento de cor (azul #2463EB), Inter, bordas de 1px no lugar de sombras.

## Git

- Commits e PRs em inglês, Conventional Commits, imperativo, minúsculo depois dos dois-pontos, sem ponto final, sem citar a stack entre parênteses.
- Trabalhe em branch própria (`feat/...`, `fix/...`), nunca direto em `main` ou `dev`.
- **Não assine commits nem PRs como Claude** (sem `Co-Authored-By`, sem "Generated with"). O `.claude/settings.json` já desliga isso.
- Descrição de PR: seções `## Summary`, `## Structure`, `## Notes`.
