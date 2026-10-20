import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'

const emptyToUndefined = (value: unknown) => (typeof value === 'string' && value.trim() === '' ? undefined : value)

const booleanFromString = z
    .union([z.boolean(), z.string()])
    .transform((value) => value === true || value === 'true' || value === '1')

const envSchema = z
    .object({
        DATABASE_URL: z.string().min(1, 'Informe DATABASE_URL'),
        /** Porta do Nest. Em dev 4000 (o Vite fica na 3000); no Docker 3000. API_PORT vale como sinônimo. */
        PORT: z.coerce.number().int().positive().default(4000),
        /** Build do React (Vite) servido pelo Nest. Sem a pasta, o Nest só serve a API. */
        WEB_DIST_DIR: z.preprocess(emptyToUndefined, z.string().optional()),
        PARTNER_API_KEY: z.string().min(16, 'PARTNER_API_KEY precisa ter pelo menos 16 caracteres'),
        WEB_PUBLIC_URL: z
            .url('WEB_PUBLIC_URL precisa ser uma URL')
            .transform((value) => value.replace(/\/+$/, '')),
        STORAGE_DIR: z.string().default('./data/storage'),
        CERT_DIR: z.string().default('./data/certs'),
        SEAL_CERT_PASSPHRASE: z.string().min(8, 'SEAL_CERT_PASSPHRASE precisa ter pelo menos 8 caracteres'),
        TSA_URL: z.preprocess(emptyToUndefined, z.url().optional()),
        WEBHOOK_ALLOWED_HOSTS: z
            .string()
            .default('localhost,127.0.0.1,web')
            .transform((value) =>
                value
                    .split(',')
                    .map((host) => host.trim().toLowerCase())
                    .filter(Boolean),
            ),
        WHATSAPP_PROVIDER: z.enum(['simulator', 'cloud_api']).default('simulator'),
        WHATSAPP_PHONE_NUMBER_ID: z.preprocess(emptyToUndefined, z.string().optional()),
        WHATSAPP_ACCESS_TOKEN: z.preprocess(emptyToUndefined, z.string().optional()),
        WHATSAPP_API_VERSION: z.string().default('v23.0'),
        ANTHROPIC_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
        AI_MODEL: z.string().default('claude-sonnet-5-5'),
        DEMO_MODE: booleanFromString.default(false),
        DEMO_TENANT_ID: z.string().default('escritorio-demo'),
    })
    .superRefine((env, ctx) => {
        if (env.WHATSAPP_PROVIDER === 'cloud_api' && (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN)) {
            ctx.addIssue({
                code: 'custom',
                path: ['WHATSAPP_PROVIDER'],
                message: 'cloud_api exige WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN',
            })
        }
    })

export type Env = z.infer<typeof envSchema>

let cached: Env | undefined

/** Carrega o .env (sem sobrescrever variáveis já definidas) e valida. Falha cedo, com mensagem clara. */
export function loadEnv(): Env {
    if (cached) return cached
    for (const candidate of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')]) {
        if (existsSync(candidate)) {
            try {
                process.loadEnvFile(candidate)
            } catch {
                // arquivo ilegível: segue com o ambiente do processo
            }
        }
    }
    const parsed = envSchema.safeParse({ ...process.env, PORT: process.env.PORT ?? process.env.API_PORT })
    if (!parsed.success) {
        const lines = parsed.error.issues.map((issue) => `  · ${issue.path.join('.')}: ${issue.message}`)
        throw new Error(`Configuração inválida do LíderSign:\n${lines.join('\n')}`)
    }
    cached = parsed.data
    return cached
}

export function env(): Env {
    return cached ?? loadEnv()
}
