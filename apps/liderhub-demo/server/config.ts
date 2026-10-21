import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))

for (const candidate of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')]) {
    if (existsSync(candidate)) {
        try {
            process.loadEnvFile(candidate)
        } catch {}
    }
}

function trimSlash(value: string) {
    return value.replace(/\/+$/, '')
}

const partnerApiKey = process.env.PARTNER_API_KEY ?? ''
if (partnerApiKey.length < 16) {
    console.error(
        'Configuração inválida da LíderHub (demo): PARTNER_API_KEY precisa ter pelo menos 16 caracteres',
    )
    process.exit(1)
}

const port = Number(process.env.LIDERHUB_SERVER_PORT ?? 4001)

export const config = {
    port,
    partnerApiKey,
    lidersignApiUrl: trimSlash(process.env.LIDERSIGN_API_URL ?? 'http://localhost:4000'),
    lidersignPublicUrl: trimSlash(process.env.LIDERSIGN_PUBLIC_URL ?? 'http://localhost:3000'),
    officeId: process.env.LIDERHUB_OFFICE_ID ?? 'escritorio-demo',
    officeName: process.env.LIDERHUB_OFFICE_NAME ?? 'Souza Advocacia',
    webhookUrl: process.env.LIDERHUB_WEBHOOK_URL ?? `http://localhost:${port}/api/webhooks/lidersign`,
    webDistDir: process.env.LIDERHUB_WEB_DIST_DIR ?? resolve(here, '../web'),
}
