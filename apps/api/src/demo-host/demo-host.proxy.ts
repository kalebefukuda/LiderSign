import { Logger } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { Readable } from 'node:stream'
import { env } from '../config/env'
import { logCall } from './call-log'

const FORWARD_REQUEST_HEADERS = ['content-type', 'accept', 'user-agent', 'accept-language']
const FORWARD_RESPONSE_HEADERS = ['content-type', 'content-disposition', 'cache-control', 'retry-after']
const ALLOWED_PREFIXES = ['/templates', '/envelopes', '/events', '/demo']

export function partnerHeaders(clientIp?: string | null): Record<string, string> {
    return {
        Authorization: `Bearer ${env().PARTNER_API_KEY}`,
        'X-Tenant-Id': env().DEMO_TENANT_ID,
        ...(clientIp ? { 'X-Forwarded-For': clientIp } : {}),
    }
}

export function createDemoHostProxy(port: number) {
    const logger = new Logger('DemoHost')

    return async (req: Request, res: Response, next: NextFunction) => {
        // Só o que a tela do escritório usa. Rotas de parceiro (/partner/*) nunca passam por aqui.
        const path = req.path
        if (!ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
            res.status(404).json({
                statusCode: 404,
                error: 'Not Found',
                message: 'Rota não disponível na demo.',
            })
            return
        }
        const target = `http://127.0.0.1:${port}/v1${req.url}`
        const controller = new AbortController()
        res.on('close', () => controller.abort())

        const headers = new Headers(partnerHeaders(req.ip))
        for (const name of FORWARD_REQUEST_HEADERS) {
            const value = req.headers[name]
            if (typeof value === 'string') headers.set(name, value)
        }

        const hasBody = !['GET', 'HEAD'].includes(req.method)
        const startedAt = Date.now()
        let upstream: globalThis.Response
        try {
            upstream = await fetch(target, {
                method: req.method,
                headers,
                body: hasBody ? (Readable.toWeb(req) as ReadableStream) : undefined,
                // @ts-expect-error duplex é exigido pelo undici para corpo em fluxo
                duplex: 'half',
                redirect: 'manual',
                signal: controller.signal,
            })
        } catch (error) {
            if (controller.signal.aborted) return
            logger.error(`Falha no proxy da demo: ${(error as Error).message}`)
            if (!res.headersSent) {
                res.status(502).json({
                    statusCode: 502,
                    error: 'Bad Gateway',
                    message: 'A API do LíderSign não respondeu. Tente de novo em instantes.',
                })
            }
            return
        }

        if (hasBody && !path.startsWith('/demo')) {
            logCall({
                direction: 'liderhub-to-lidersign',
                method: req.method,
                path: `/v1${path}`,
                status: upstream.status,
                ms: Date.now() - startedAt,
                detail: null,
            })
        }

        res.status(upstream.status)
        for (const name of FORWARD_RESPONSE_HEADERS) {
            const value = upstream.headers.get(name)
            if (value) res.setHeader(name, value)
        }
        const isStream = upstream.headers.get('content-type')?.includes('text/event-stream')
        if (isStream) {
            res.setHeader('Cache-Control', 'no-cache, no-transform')
            res.setHeader('Connection', 'keep-alive')
            res.setHeader('X-Accel-Buffering', 'no')
            res.flushHeaders()
        }
        if (!upstream.body) {
            res.end()
            return
        }
        const body = Readable.fromWeb(upstream.body as import('node:stream/web').ReadableStream)
        body.on('error', (error) => {
            if (!controller.signal.aborted) logger.warn(`Fluxo interrompido: ${error.message}`)
            res.end()
        })
        body.pipe(res)
        void next
    }
}
