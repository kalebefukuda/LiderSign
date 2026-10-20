#!/usr/bin/env node
/**
 * MCP por HTTP (streamable), para clientes remotos e agentes da própria LíderHub.
 * Por padrão escuta só em 127.0.0.1. Com MCP_TOKEN definido, exige Authorization: Bearer <MCP_TOKEN>.
 */
import { createHash, timingSafeEqual } from 'node:crypto'
import http from 'node:http'
import { createLiderSignMcpServer } from './mcp-server.js'

const port = Number(process.env.MCP_PORT ?? 4100)
const host = process.env.MCP_HOST ?? '127.0.0.1'
const token = process.env.MCP_TOKEN?.trim()
const allowedHosts = (process.env.MCP_ALLOWED_HOSTS ?? 'localhost,127.0.0.1')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

if (host !== '127.0.0.1' && host !== 'localhost' && !token) {
    console.error('[lidersign-mcp] MCP_TOKEN é obrigatório ao expor o MCP fora da máquina local.')
    process.exit(1)
}

function digest(value: string): Buffer {
    return createHash('sha256').update(value).digest()
}

function authorized(header: string | undefined): boolean {
    if (!token) return true
    const presented = header?.startsWith('Bearer ') ? header.slice(7).trim() : ''
    return timingSafeEqual(digest(presented), digest(token))
}

const server = createLiderSignMcpServer()

const httpServer = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `localhost:${port}`}`)

    if (url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: true }))
        return
    }
    if (url.pathname !== '/mcp') {
        res.writeHead(404, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Não encontrado' }))
        return
    }
    if (!authorized(req.headers.authorization)) {
        res.writeHead(401, { 'Content-Type': 'application/json', 'WWW-Authenticate': 'Bearer' }).end(
            JSON.stringify({ error: 'Token do MCP ausente ou inválido' }),
        )
        return
    }

    try {
        await server.startHTTP({
            url,
            httpPath: '/mcp',
            req,
            res,
            options: {
                serverless: true,
                enableDnsRebindingProtection: true,
                allowedHosts,
            },
        })
    } catch (error) {
        console.error('[lidersign-mcp] erro na requisição:', error instanceof Error ? error.message : error)
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' }).end(
                JSON.stringify({ error: 'Erro interno no MCP' }),
            )
        }
    }
})

httpServer.listen(port, host, () => {
    console.error(`[lidersign-mcp] ouvindo em http://${host}:${port}/mcp`)
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
        httpServer.close()
        server.close().catch(() => undefined)
        process.exit(0)
    })
}
