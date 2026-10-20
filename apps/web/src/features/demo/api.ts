import type { ConnectTenantResponse, MessageDto, TenantDto, WebhookPayload } from '@lidersign/shared'

import { DEMO_HOST_BASE, enc, PARTNER_BASE } from '@/lib/endpoints'
import { fetchJson } from '@/lib/http'

/** Situação do escritório de demonstração, vista pelo "back da LíderHub". */
export type DemoStatus = {
    active: boolean
    tenant: TenantDto | null
    templatesCount: number
    whatsappProvider: 'simulator' | 'cloud_api'
}

/** Webhook que a "LíderHub" recebeu do LíderSign, com o HMAC conferido. */
export type ReceivedWebhook = {
    receivedAt: string
    verified: boolean
    event: string | null
    payload: WebhookPayload | null
    reason: string | null
}

export const demoApi = {
    statusUrl: `${DEMO_HOST_BASE}/status`,
    webhooksUrl: `${DEMO_HOST_BASE}/webhooks`,
    messagesUrl: `${PARTNER_BASE}/demo/messages`,
    status: () => fetchJson<DemoStatus>(`${DEMO_HOST_BASE}/status`, { cache: 'no-store' }),
    activate: () => fetchJson<Omit<ConnectTenantResponse, 'webhookSecret'>>(`${DEMO_HOST_BASE}/activate`, { method: 'POST' }),
    deactivate: (externalId: string) =>
        fetchJson<void>(`${PARTNER_BASE}/partner/tenants/${enc(externalId)}`, { method: 'DELETE' }),
    reset: () => fetchJson<void>(`${PARTNER_BASE}/demo/reset`, { method: 'POST' }),
    messages: () => fetchJson<MessageDto[]>(`${PARTNER_BASE}/demo/messages`, { cache: 'no-store' }),
}
