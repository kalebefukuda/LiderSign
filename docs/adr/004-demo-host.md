# ADR 004 · Chave de parceiro e o "back da LíderHub" na demo

**Status:** substituída pela [ADR 005](005-produto-unico-e-assinatura-na-conversa.md)

## Contexto

O maior atrito de hoje é o token: cada escritório cria conta no assinador e cola uma chave de API na LíderHub. Queríamos ativar com um clique, sem expor credencial no navegador.

## Decisão

- **Modelo de parceiro:** a LíderHub tem uma única chave de parceiro e identifica o escritório pelo próprio id (`X-Tenant-Id`). "Ativar" chama `POST /v1/partner/tenants`, que é idempotente e já cria os modelos de exemplo.
- **Webhooks assinados** (HMAC-SHA256 com tempo) para a LíderHub atualizar o CRM.
- **Na demo**, o módulo `/demo-host` faz o papel do back da LíderHub: guarda a chave, repassa as chamadas para `/v1`, ativa o escritório e recebe os webhooks conferindo o HMAC. Ele só é registrado com `DEMO_MODE=true`.

## Consequências

- O escritório nunca vê token, e o navegador nunca recebe a chave de parceiro.
- O `/demo-host` não tem autenticação: **nunca deve ir para produção**. Dentro da LíderHub, o papel dele é do back real deles, com o login deles.
