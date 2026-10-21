import { Logger } from '@nestjs/common'

import { env } from './env'

const QUICK_TUNNEL = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/
const QUICK_TUNNEL_EXACT = /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/

let tunnelUrl: string | null = null

export function publicUrl(): string {
    return tunnelUrl ?? env().WEB_PUBLIC_URL
}

export function isTunnelActive(): boolean {
    return tunnelUrl !== null
}

async function readTunnelUrl(metricsUrl: string): Promise<string | null> {
    for (const path of ['/quicktunnel', '/metrics']) {
        try {
            const res = await fetch(`${metricsUrl}${path}`, { signal: AbortSignal.timeout(2000) })
            if (!res.ok) continue
            const text = await res.text()
            const hostname = path === '/quicktunnel' ? safeHostname(text) : null
            const candidate = hostname ? `https://${hostname}` : text.match(QUICK_TUNNEL)?.[0]
            if (candidate && QUICK_TUNNEL_EXACT.test(candidate)) return candidate
        } catch {}
    }
    return null
}

function safeHostname(text: string): string | null {
    try {
        const parsed = JSON.parse(text) as { hostname?: unknown }
        return typeof parsed.hostname === 'string' && parsed.hostname
            ? parsed.hostname.replace(/^https:\/\//, '')
            : null
    } catch {
        return null
    }
}

export function startTunnelDiscovery(): void {
    const metricsUrl = env().TUNNEL_METRICS_URL
    if (!metricsUrl) return
    const logger = new Logger('Túnel')
    let timer: NodeJS.Timeout
    let misses = 0

    const tick = async () => {
        const found = await readTunnelUrl(metricsUrl)
        if (found) {
            misses = 0
            if (found !== tunnelUrl) {
                tunnelUrl = found
                logger.log(`Links públicos em ${found}`)
            }
        } else if (tunnelUrl && ++misses >= 2) {
            tunnelUrl = null
            logger.warn('Túnel fora do ar: os links voltam a usar WEB_PUBLIC_URL')
        }
        timer = setTimeout(() => void tick(), tunnelUrl ? 30_000 : 3_000)
        timer.unref()
    }
    void tick()
}
