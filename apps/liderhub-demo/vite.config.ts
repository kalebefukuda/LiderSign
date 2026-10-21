import path from 'node:path'
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const root = path.dirname(fileURLToPath(import.meta.url))
const serverTarget = process.env.LIDERHUB_SERVER_URL ?? 'http://localhost:4001'

const proxied = {
    target: serverTarget,
    changeOrigin: false,
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
            '@lidersign/shared': path.resolve(root, '../../packages/shared/src/index.ts'),
            '@lidersign/ui': path.resolve(root, '../../packages/ui/src/index.ts'),
        },
    },
    server: { port: 3001, strictPort: true, host: true, proxy: { '/api': proxied } },
    preview: { port: 3001, strictPort: true, proxy: { '/api': proxied } },
    build: { outDir: 'dist/web', emptyOutDir: true, sourcemap: false, chunkSizeWarningLimit: 900 },
})
