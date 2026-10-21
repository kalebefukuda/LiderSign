# ADR 001 · React + Nest, TypeScript de ponta a ponta

**Status:** aceita

## Contexto

O LíderSign precisa caber dentro da LíderHub sem atrito. Perguntamos a stack para eles: NestJS no back, React no front, Supabase para banco e tempo real, Mastra para IA, tudo em TypeScript.

A primeira versão do plano usava Python (FastAPI) por causa da biblioteca de assinatura de PDF mais madura (pyHanko). Depois, o front em Next.js.

## Decisão

- Back em **NestJS**, front em **React + Vite**, contrato em `packages/shared`, IA e MCP com **Mastra**. Monorepo pnpm + Turborepo.
- Em produção, **um processo**: o Nest serve a API e o build do React na mesma porta.
- Banco **Postgres com Prisma**. O Supabase também é Postgres, então na LíderHub basta trocar a `DATABASE_URL`.
- Selagem em Node com `@signpdf` (PAdES) e `node-forge` (carimbo do tempo RFC 3161 escrito à mão).

## Consequências

- O módulo pode ser levado para dentro da LíderHub: os componentes React vão para o front deles e o módulo Nest para o back.
- Um container e uma URL: mais simples de rodar, de testar e de expor por túnel para o celular.
- Em Node, a `@signpdf` não embute o carimbo do tempo dentro da assinatura (PAdES-B-T). O carimbo fica anexado ao dossiê e verificável à parte. Embutir é um próximo passo.
- Sem SSR: título e metadados de compartilhamento ficam no `index.html` e por rota via `document.title`.
