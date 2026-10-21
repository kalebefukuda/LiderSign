# CLAUDE.md

Guia para agentes (Claude Code) trabalharem neste repositório.

## O que é

LíderSign: assinador eletrônico nativo da LíderHub (automação de atendimento por WhatsApp para escritórios de advocacia). Visão do produto no README; contrato técnico em `docs/spec.md`; decisões em `docs/adr/`.

## Estrutura

```
apps/api            NestJS 11 + Prisma 6 (Postgres). Serve também o build do React.
apps/web            React 19 + Vite 7 + React Router 7 + Tailwind 4 (SPA do LíderSign)
apps/liderhub-demo  Simulação da LíderHub: Express (guarda a chave de parceiro) + React. Só fala com o LíderSign pela API
packages/shared     Schemas zod, DTOs e utilitários usados por todos (CommonJS)
packages/ui         Componentes de interface e utilitários dos dois apps (código-fonte, sem build)
packages/agent      Mastra: servidor MCP + extrator de modelos com IA (ESM)
e2e/                Playwright: fluxo completo, com os dois apps
infra/              entrypoint do Docker e guia do túnel
```

## Comandos

```bash
pnpm install
pnpm build                                 # shared → agent → web → api → liderhub-demo
pnpm dev                                   # LíderSign: Nest :4000 + Vite :3000 · LíderHub: servidor :4001 + Vite :3001
pnpm db:migrate                            # prisma migrate deploy
pnpm --filter @lidersign/api typecheck
pnpm --filter @lidersign/web typecheck
pnpm e2e                                   # precisa dos dois apps no ar (E2E_BASE_URL :3000, E2E_LIDERHUB_URL :3001)
docker compose up --build                  # LíderHub em http://localhost:3001, LíderSign em http://localhost:3000
```

Mudou `packages/shared`? Rode `pnpm --filter @lidersign/shared build` antes de compilar api ou web.

## Regras do projeto

- **Contrato primeiro:** rota nova ou campo novo nasce em `packages/shared` (schema zod + DTO) e em `docs/spec.md`, e só depois na API e no front.
- **O navegador nunca recebe a chave de parceiro.** Ela fica no servidor da LíderHub (`apps/liderhub-demo`). O painel do LíderSign usa o cookie de sessão criado em `/entrar`; toda escrita com cookie manda `X-LiderSign-Client: web`. Rotas públicas: só `/v1/sign/:token`, `/v1/public/*` e `/entrar`.
- **Os dois apps não se importam:** a LíderHub fala com o LíderSign só por HTTP. Código comum vai em `packages/shared` ou `packages/ui`.
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
- Visual: sóbrio, muito respiro, um acento de cor (azul #2463EB), Inter, bordas de 1px no lugar de sombras.

## Git

- Commits e PRs em inglês, Conventional Commits, imperativo, minúsculo depois dos dois-pontos, sem ponto final, sem citar a stack entre parênteses.
- Trabalhe em branch própria (`feat/...`, `fix/...`), nunca direto em `main` ou `dev`.
- **Não assine commits nem PRs como Claude** (sem `Co-Authored-By`, sem "Generated with"). O `.claude/settings.json` já desliga isso.
- Descrição de PR: seções `## Summary`, `## Structure`, `## Notes`.
