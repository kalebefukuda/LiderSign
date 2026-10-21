import express from 'express'
import helmet from 'helmet'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { config } from './config.js'
import { apiRoutes, errorHandler, webhookRoute } from './routes.js'

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 'loopback')
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
                frameSrc: ["'self'", config.lidersignPublicUrl],
                frameAncestors: ["'none'"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                upgradeInsecureRequests: null,
            },
        },
        crossOriginEmbedderPolicy: false,
    }),
)

app.get('/health', (_req, res) => res.json({ ok: true }))
app.use('/api/webhooks/lidersign', webhookRoute())
app.use('/api', apiRoutes())

const index = join(config.webDistDir, 'index.html')
if (existsSync(index)) {
    app.use(express.static(config.webDistDir, { index: false, maxAge: '1h' }))
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(index))
}

app.use(errorHandler)

app.listen(config.port, '0.0.0.0', () => {
    console.log(
        `[liderhub] simulação no ar em :${config.port} · LíderSign em ${config.lidersignApiUrl} · escritório ${config.officeId}`,
    )
})
