import 'reflect-metadata'
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import express from 'express'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/http-exception.filter'
import { loadEnv } from './config/env'
import { startTunnelDiscovery } from './config/public-url'

function parseTrustProxy(value: string | undefined): number | string {
    const trimmed = (value ?? '').trim()
    if (trimmed === '') return 'loopback'
    if (/^\d+$/.test(trimmed)) return Number(trimmed)
    return trimmed
}

async function bootstrap() {
    const env = loadEnv()
    const app = await NestFactory.create<NestExpressApplication>(AppModule.register(), {
        logger: ['log', 'warn', 'error'],
        bodyParser: false,
    })

    app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY))
    app.disable('x-powered-by')
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", 'data:', 'blob:'],
                    fontSrc: ["'self'", 'data:'],
                    connectSrc: ["'self'"],
                    mediaSrc: ["'self'", 'blob:'],
                    frameSrc: ["'self'", 'blob:'],
                    frameAncestors: ["'self'"],
                    objectSrc: ["'none'"],
                    baseUri: ["'self'"],
                    formAction: ["'self'"],
                    upgradeInsecureRequests: null,
                },
            },
            crossOriginEmbedderPolicy: false,
            frameguard: { action: 'sameorigin' },
        }),
    )

    // O webhook da Meta é conferido pelo HMAC do corpo cru; as demais rotas só recebem JSON
    // Só o celular simulado manda foto (selfie) em JSON; o resto fica no limite de 1 MB
    app.use('/v1/whatsapp/simulator', express.json({ limit: '8mb' }))
    app.use(
        express.json({
            limit: '1mb',
            verify: (req, _res, buf) => {
                if ((req as { url?: string }).url?.startsWith('/v1/whatsapp/webhook')) {
                    ;(req as { rawBody?: Buffer }).rawBody = Buffer.from(buf)
                }
            },
        }),
    )

    app.useGlobalFilters(new HttpExceptionFilter())
    app.enableShutdownHooks()
    await app.listen(env.PORT, '0.0.0.0')
    startTunnelDiscovery()
    Logger.log(
        `No ar em :${env.PORT} · WhatsApp: ${env.WHATSAPP_PROVIDER} · IA: ${env.ANTHROPIC_API_KEY ? 'ligada' : 'roteiro reserva'} · demo: ${env.DEMO_MODE ? 'sim' : 'não'}`,
        'LíderHub',
    )
}

bootstrap().catch((error: Error) => {
    console.error(error.message)
    process.exit(1)
})
