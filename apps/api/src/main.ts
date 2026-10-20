import 'reflect-metadata'
import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import express, { type NextFunction, type Request, type Response } from 'express'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/http-exception.filter'
import { loadEnv } from './config/env'
import { startTunnelDiscovery } from './config/public-url'
import { createDemoHostProxy } from './demo-host/demo-host.proxy'

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

    // Em quem confiar no X-Forwarded-For (IP da evidência e limite de requisições).
    // Padrão: só loopback. Atrás de um proxy ou túnel conhecido, TRUST_PROXY=1 (número de saltos).
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
                    frameSrc: ["'self'", 'blob:'],
                    frameAncestors: ["'self'"],
                    objectSrc: ["'none'"],
                    baseUri: ["'self'"],
                    formAction: ["'self'"],
                    // Sem upgrade forçado: a demo também roda em http (localhost ou IP da rede local)
                    upgradeInsecureRequests: null,
                },
            },
            crossOriginEmbedderPolicy: false,
        }),
    )

    if (env.DEMO_MODE) {
        // Receptor de webhooks da "LíderHub": precisa do corpo cru para conferir o HMAC
        app.use('/demo-host/webhook', express.raw({ type: '*/*', limit: '1mb' }))
        // Proxy de parceiro da demo: o corpo segue em fluxo (multipart, SSE), sem passar pelos parsers
        app.use('/demo-host/v1', createDemoHostProxy(env.PORT))
    }
    const json = express.json({ limit: '1mb' })
    app.use((req: Request, res: Response, next: NextFunction) =>
        req.path.startsWith('/demo-host/v1') ? next() : json(req, res, next),
    )

    app.useGlobalFilters(new HttpExceptionFilter())
    app.enableShutdownHooks()
    await app.listen(env.PORT, '0.0.0.0')
    startTunnelDiscovery()
    Logger.log(
        `No ar em :${env.PORT} · WhatsApp: ${env.WHATSAPP_PROVIDER} · demo: ${env.DEMO_MODE ? 'sim' : 'não'}`,
        'LíderSign',
    )
}

bootstrap().catch((error: Error) => {
    console.error(error.message)
    process.exit(1)
})
