# Abrir o link de assinatura no celular de verdade

**Com o `docker compose up` isso já é automático:** o compose sobe um túnel rápido da Cloudflare (serviço `tunnel`, sem conta) e o app lê a URL `https://….trycloudflare.com` nas métricas dele e usa nos links. Nada para configurar. A URL é pública enquanto o túnel roda e muda a cada vez que ele sobe; `docker compose stop tunnel` desliga e os links voltam para o `WEB_PUBLIC_URL`.

Na demonstração, o cliente assina no celular simulado da Caixa de entrada, sem link. O link só aparece no plano B (**Ver no navegador**). O resto deste guia é para rodar sem o compose (ex.: `pnpm dev`), quando o link usa o `WEB_PUBLIC_URL`. Com `http://localhost:3000`, ele só abre no seu computador. Em **Configurações** estão os dois jeitos de o celular abrir, com os comandos prontos para copiar.

O Nest serve a API e o site na mesma porta, então basta apontar para ela (3000, ou a do `APP_PORT`).

## Opção A: mesmo Wi-Fi (mais simples)

```bash
ipconfig getifaddr en0      # macOS; no Windows: ipconfig (IPv4)
```

No `.env` da raiz, com o IP que apareceu:

```bash
WEB_PUBLIC_URL=http://192.168.0.10:3000
```

Depois `docker compose up -d` e envie um documento novo: o QR code já sai com esse endereço. Sem HTTPS, o navegador do celular não libera câmera e localização (a selfie do nível Reforçado precisa da opção B).

## Opção B: túnel HTTPS (qualquer rede)

> **Atenção:** com o túnel aberto, qualquer pessoa com a URL abre a página de assinatura (que pede o CPF) e a verificação pública. A área do escritório não abre pelo túnel: a entrada de demonstração só vale no próprio computador. Mesmo assim, feche o túnel depois da gravação.

### 1. Suba o túnel (sem conta)

```bash
# macOS: brew install cloudflared · Windows: winget install --id Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:3000
```

Ele mostra uma URL do tipo `https://algumas-palavras.trycloudflare.com`. Deixe o terminal aberto.

### 2. Reinicie com a URL pública

```bash
WEB_PUBLIC_URL=https://algumas-palavras.trycloudflare.com docker compose up -d
```

No Windows (PowerShell): `$env:WEB_PUBLIC_URL="https://..."; docker compose up -d`. Ou coloque `WEB_PUBLIC_URL=...` no `.env` da raiz.

Os envelopes criados depois disso já saem com o link público.

## WhatsApp oficial (opcional, número de teste da Meta)

Sem isso, tudo funciona no modo demonstração, com o celular simulado. Se tiver acesso à Meta, no `.env` da raiz:

```bash
WHATSAPP_PROVIDER=cloud_api
WHATSAPP_PHONE_NUMBER_ID=<Phone Number ID da tela "Configuração da API">
WHATSAPP_ACCESS_TOKEN=<token temporário; nunca versione>
WHATSAPP_VERIFY_TOKEN=<texto seu, 16+ caracteres>
WHATSAPP_APP_SECRET=<App secret, em Configurações do app > Básico>
```

Depois: `docker compose up -d` de novo. Em **Configurações**, "Enviar mensagem de teste" confere o envio.

Para receber as respostas (CPF, botões, selfie), no painel do app da Meta, em WhatsApp > Configuração, cadastre o webhook `https://<sua URL do túnel>/v1/whatsapp/webhook` com o mesmo verify token e assine o campo `messages`. A URL do quick tunnel muda a cada subida: para algo estável, use um túnel nomeado da Cloudflare. Em **Enviar contrato**, no modo demonstração, dá para informar o seu número no lugar do número fictício do contato.

Antes de enviar, mande um "oi" do seu celular para o número de teste: isso abre a janela de 24 h e libera mensagens em texto livre, sem modelo aprovado.

**Dica para números do Brasil:** se a Meta recusar o destinatário ("recipient not in allowed list"), informe o celular exatamente como ele aparece na lista "Para" da Meta. Em muitos casos ela registra o número sem o 9 extra depois do DDD (ex.: `55 47 8888-7777` em vez de `55 47 98888-7777`). Teste as duas formas.
