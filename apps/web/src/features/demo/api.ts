import type { ConnectTenantResponse, MessageStatus, TenantDto, WebhookPayload } from '@lidersign/shared'

import { fetchJson } from '@lidersign/ui'

import { DEMO_HOST_BASE, PARTNER_BASE } from '@/lib/endpoints'

export type DemoStatus = {
    active: boolean
    tenant: TenantDto | null
    templatesCount: number
    whatsappProvider: 'simulator' | 'cloud_api'
    whatsappConfigured: boolean
    webPublicUrl: string
    tunnel: boolean
}

export type ReceivedWebhook = {
    receivedAt: string
    verified: boolean
    event: string | null
    payload: WebhookPayload | null
    reason: string | null
}

export type CallLogEntry = {
    at: string
    direction: 'liderhub-to-lidersign' | 'lidersign-to-liderhub'
    method: string
    path: string
    status: number
    ms: number
    detail: string | null
}

const STATUS_EVENT = 'lidersign:demo-status'

function announce<T>(promise: Promise<T>): Promise<T> {
    return promise.then((result) => {
        window.dispatchEvent(new Event(STATUS_EVENT))
        return result
    })
}

export function onDemoStatusChange(listener: () => void) {
    window.addEventListener(STATUS_EVENT, listener)
    return () => window.removeEventListener(STATUS_EVENT, listener)
}

export const demoApi = {
    statusUrl: `${DEMO_HOST_BASE}/status`,
    webhooksUrl: `${DEMO_HOST_BASE}/webhooks`,
    callsUrl: `${DEMO_HOST_BASE}/calls`,
    status: () => fetchJson<DemoStatus>(`${DEMO_HOST_BASE}/status`, { cache: 'no-store' }),
    activate: () =>
        announce(
            fetchJson<Omit<ConnectTenantResponse, 'webhookSecret'>>(`${DEMO_HOST_BASE}/activate`, {
                method: 'POST',
            }),
        ),
    deactivate: () => announce(fetchJson<void>(`${DEMO_HOST_BASE}/deactivate`, { method: 'POST' })),
    reset: () => announce(fetchJson<void>(`${PARTNER_BASE}/demo/reset`, { method: 'POST' })),
    whatsappTest: (phone: string) =>
        fetchJson<{ status: MessageStatus; error: string | null; provider: string }>(
            `${DEMO_HOST_BASE}/whatsapp-test`,
            {
                method: 'POST',
                body: JSON.stringify({ phone }),
            },
        ),
}

export { isLocalUrl } from '@/lib/url'
