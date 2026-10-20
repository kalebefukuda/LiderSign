#!/usr/bin/env node
/**
 * MCP por stdio: é assim que o Claude Code e o Claude Desktop sobem o servidor.
 * stdout é do protocolo; qualquer log vai para stderr.
 */
import { createLiderSignMcpServer } from './mcp-server.js'

console.log = (...args: unknown[]) => console.error(...args)

const server = createLiderSignMcpServer()

server.startStdio().catch((error: unknown) => {
    console.error('[lidersign-mcp] falha ao iniciar:', error instanceof Error ? error.message : error)
    process.exit(1)
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, async () => {
        await server.close().catch(() => undefined)
        process.exit(0)
    })
}
