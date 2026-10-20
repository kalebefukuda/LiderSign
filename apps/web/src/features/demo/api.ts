import type { ConnectTenantResponse, MessageStatus, TenantDto, WebhookPayload } from '@lidersign/shared'

import { DEMO_HOST_BASE, PARTNER_BASE } from '@/lib/endpoints'
import { fetchJson } from '@/lib/http'

/** Situação do escritório de demonstração, vista pelo "back da LíderHub". */
export type DemoStatus = {
    active: boolean
    tenant: TenantDto | null
    templatesCount: number
    whatsappProvider: 'simulator' | 'cloud_api'
    /** WhatsApp oficial com Phone Number ID e token preenchidos */
    whatsappConfigured: boolean
    /** Endereço que vai nos links (WEB_PUBLIC_URL) */
    webPublicUrl: string
}

/** Webhook que a "LíderHub" recebeu do LíderSign, com o HMAC conferido. */
export type ReceivedWebhook = {
    receivedAt: string
    verified: boolean
    event: string | null
    payload: WebhookPayload | null
    reason: string | null
}

/** Uma linha do registro da integração (ações da LíderHub e webhooks de volta). */
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

/** Avisa o resto da tela (layout do painel, menus) que o escritório ligou ou desligou. */
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
        announce(fetchJson<Omit<ConnectTenantResponse, 'webhookSecret'>>(`${DEMO_HOST_BASE}/activate`, { method: 'POST' })),
    deactivate: () => announce(fetchJson<void>(`${DEMO_HOST_BASE}/deactivate`, { method: 'POST' })),
    reset: () => announce(fetchJson<void>(`${PARTNER_BASE}/demo/reset`, { method: 'POST' })),
    whatsappTest: (phone: string) =>
        fetchJson<{ status: MessageStatus; error: string | null; provider: string }>(`${DEMO_HOST_BASE}/whatsapp-test`, {
            method: 'POST',
            body: JSON.stringify({ phone }),
        }),
}

export { isLocalUrl } from '@/lib/url'
