import type { WebhookPayload } from '@lidersign/shared'
import type { Response } from 'express'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { logCall } from './call-log.js'
import { call, officePath } from './lidersign.js'

const TOLERANCE_SECONDS = 5 * 60
const MAX_RECEIVED = 30

export type ReceivedWebhook = {
    receivedAt: string
    verified: boolean
    event: string | null
    envelopeId: string | null
    reason: string | null
}

let secret: string | null = null
let received: ReceivedWebhook[] = []
const clients = new Set<Response>()

export function rememberSecret(value: string | undefined) {
    if (value) secret = value
}

export function forgetWebhooks() {
    secret = null
    received = []
}

export function listWebhooks() {
    return received
}

async function fetchSecret(): Promise<string | null> {
    try {
        const json = await call<{ webhookSecret: string }>(`${officePath()}/webhook-secret`, {
            tenant: false,
        })
        secret = json.webhookSecret
        return secret
    } catch {
        return null
    }
}

function check(key: string, header: string, body: string): string | null {
    const parts = Object.fromEntries(
        header.split(',').map((part) => {
            const [name, ...value] = part.trim().split('=')
            return [name, value.join('=')]
        }),
    ) as { t?: string; v1?: string }
    const timestamp = Number(parts.t)
    if (!parts.t || !parts.v1 || !Number.isFinite(timestamp)) return 'cabeçalho inválido'
    if (Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) return 'fora da janela de 5 minutos'
    const expected = createHmac('sha256', key).update(`${parts.t}.${body}`).digest()
    const given = Buffer.from(parts.v1, 'hex')
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return 'HMAC não confere'
    return null
}

export async function receive(rawBody: Buffer, signature: string | undefined): Promise<ReceivedWebhook> {
    const body = rawBody.toString('utf8')
    let reason: string | null = 'sem assinatura'
    if (signature) {
        const key = secret ?? (await fetchSecret())
        reason = key ? check(key, signature, body) : 'sem segredo'
        if (reason === 'HMAC não confere') {
            const fresh = await fetchSecret()
            if (fresh) reason = check(fresh, signature, body)
        }
    }
    let payload: WebhookPayload | null = null
    try {
        payload = JSON.parse(body) as WebhookPayload
    } catch {
        payload = null
    }
    const item: ReceivedWebhook = {
        receivedAt: new Date().toISOString(),
        verified: reason === null,
        event: payload?.event ?? null,
        envelopeId: payload?.data?.envelopeId ?? null,
        reason,
    }
    received = [item, ...received].slice(0, MAX_RECEIVED)
    logCall({
        direction: 'lidersign-to-liderhub',
        method: 'POST',
        path: '/api/webhooks/lidersign',
        status: item.verified ? 200 : 401,
        ms: 0,
        detail: `${item.event ?? 'evento'} · ${item.verified ? 'HMAC válido' : `recusado (${reason})`}`,
    })
    if (item.verified) broadcast({ type: 'contract.updated', event: item.event, envelopeId: item.envelopeId })
    return item
}

export function subscribe(res: Response) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()
    res.write(': conectado\n\n')
    clients.add(res)
    const heartbeat = setInterval(() => res.write(': ping\n\n'), 15_000)
    res.on('close', () => {
        clearInterval(heartbeat)
        clients.delete(res)
    })
}

export function broadcast(data: Record<string, unknown>) {
    const line = `data: ${JSON.stringify(data)}\n\n`
    for (const client of clients) client.write(line)
}
