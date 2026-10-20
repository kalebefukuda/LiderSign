import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const root = path.dirname(fileURLToPath(import.meta.url))
const apiTarget = process.env.API_URL ?? 'http://localhost:4000'

/**
 * Em desenvolvimento o Vite repassa a API para o Nest (mesma origem, sem CORS).
 * Em produção o próprio Nest serve este build (apps/web/dist): um processo, uma URL.
 */
const proxied = {
    target: apiTarget,
    changeOrigin: false,
    // SSE: nada de compressão nem buffer no meio do caminho
    configure: (proxy: { on: (event: string, handler: (...args: never[]) => void) => void }) => {
        proxy.on('proxyRes', ((proxyRes: { headers: Record<string, string> }) => {
            if (proxyRes.headers['content-type']?.includes('text/event-stream')) {
                proxyRes.headers['cache-control'] = 'no-cache, no-transform'
                proxyRes.headers['x-accel-buffering'] = 'no'
            }
        }) as never)
    },
}

export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            '@': path.resolve(root, 'src'),
            // Fonte TS do contrato: o Vite compila direto, sem depender do build CJS
            '@lidersign/shared': path.resolve(root, '../../packages/shared/src/index.ts'),
        },
    },
    server: {
        port: 3000,
        strictPort: true,
        host: true,
        proxy: {
            '/v1': proxied,
            '/demo-host': proxied,
            '/health': proxied,
        },
    },
    preview: {
        port: 3000,
        strictPort: true,
        proxy: {
            '/v1': proxied,
            '/demo-host': proxied,
            '/health': proxied,
        },
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: false,
        chunkSizeWarningLimit: 900,
    },
})
