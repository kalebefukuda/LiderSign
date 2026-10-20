# Abrir o link de assinatura no celular de verdade

O link que vai no WhatsApp usa o `WEB_PUBLIC_URL`. Com `http://localhost:3000`, ele só abre no seu computador. Para o celular abrir, exponha o app por um túnel HTTPS (o HTTPS também libera câmera e localização no navegador do celular).

O Nest serve a API e o site na mesma porta, então basta um túnel, para a porta 3000.

> **Atenção:** com o túnel aberto, qualquer pessoa com a URL acessa a demo (inclusive o celular simulado e o painel sem login). Use só durante a gravação e feche o túnel (Ctrl+C) depois.

## 1. Suba o túnel (sem conta)

```bash
# macOS: brew install cloudflared · Windows: winget install --id Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:3000
```

Ele mostra uma URL do tipo `https://algumas-palavras.trycloudflare.com`. Deixe o terminal aberto.

## 2. Reinicie com a URL pública

```bash
WEB_PUBLIC_URL=https://algumas-palavras.trycloudflare.com docker compose up -d
```

No Windows (PowerShell): `$env:WEB_PUBLIC_URL="https://..."; docker compose up -d`. Ou coloque `WEB_PUBLIC_URL=...` no `.env` da raiz.

Os envelopes criados depois disso já saem com o link público.

## 3. WhatsApp oficial (número de teste da Meta)

No `.env` da raiz:

```bash
WHATSAPP_PROVIDER=cloud_api
WHATSAPP_PHONE_NUMBER_ID=<Phone Number ID da tela "Configuração da API">
WHATSAPP_ACCESS_TOKEN=<token temporário; nunca versione>
```

Depois: `docker compose up -d` de novo.

Antes de enviar, mande um "oi" do seu celular para o número de teste: isso abre a janela de 24 h e libera mensagens em texto livre, sem modelo aprovado.

**Dica para números do Brasil:** se a Meta recusar o destinatário ("recipient not in allowed list"), informe o celular exatamente como ele aparece na lista "Para" da Meta. Em muitos casos ela registra o número sem o 9 extra depois do DDD (ex.: `55 47 8888-7777` em vez de `55 47 98888-7777`). Teste as duas formas.
