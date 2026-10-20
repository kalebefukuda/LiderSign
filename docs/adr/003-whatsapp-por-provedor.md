# ADR 003 · WhatsApp atrás de um provedor trocável

**Status:** aceita

## Contexto

O link de assinatura e o código de confirmação vão pelo WhatsApp. Quem avalia o projeto não tem conta na Meta, e o número de teste da Meta só envia para números cadastrados. Na integração real, quem conversa com o lead é a LíderHub, pelo número oficial dela.

## Decisão

Uma interface de envio com dois provedores, escolhida por `WHATSAPP_PROVIDER`:

- `simulator` (padrão): grava a mensagem no banco e mostra no celular simulado da `/demo`. Roda sem conta nenhuma.
- `cloud_api`: API oficial da Meta (Graph API `/{phone-number-id}/messages`), para testar no celular de verdade.

Toda mensagem é persistida, nos dois casos, e entra no painel do envelope.

Não usamos API não oficial: a LíderHub é parceira certificada da Meta, e uma API não oficial traria risco de banimento.

## Consequências

- O projeto roda e é testado sem dependências externas.
- Para o celular de verdade, basta o número de teste da Meta e um túnel HTTPS (`infra/tunnel.md`).
- Na LíderHub, um terceiro provedor delegaria o envio à própria plataforma, via webhook.
