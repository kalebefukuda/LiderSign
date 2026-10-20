/**
 * DEMONSTRAÇÃO APENAS. Faz o papel do back-end da LíderHub: ativa o escritório com a chave de parceiro
 * e recebe os webhooks do LíderSign validando o HMAC, exatamente como um parceiro externo faria.
 * Só sobe com DEMO_MODE=true. Nunca usar em produção.
 */
import { BadRequestException, ConflictException, Injectable, Logger } from '@nestjs/common'
import type { ConnectTenantResponse, MessageStatus, TemplateDto, TenantDto, WebhookPayload } from '@lidersign/shared'
import { isValidBrPhone, normalizeBrPhone } from '@lidersign/shared'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from '../config/env'
import { MessagingService } from '../messaging/messaging.service'
import { PrismaService } from '../prisma/prisma.service'
import { isTunnelActive, publicUrl } from '../config/public-url'
import { clearCalls, logCall } from './call-log'
import { partnerHeaders } from './demo-host.proxy'

const TOLERANCE_SECONDS = 5 * 60
const MAX_RECEIVED = 20

export type ReceivedWebhook = {
    receivedAt: string
    verified: boolean
    event: string | null
    payload: WebhookPayload | null
    reason: string | null
}

export type DemoHostStatus = {
    active: boolean
    tenant: TenantDto | null
    templatesCount: number
    whatsappProvider: 'simulator' | 'cloud_api'
    /** Cloud API com Phone Number ID e token preenchidos */
    whatsappConfigured: boolean
    /** Túnel HTTPS do docker compose no ar (links abrem em qualquer celular) */
    tunnel: boolean
    /** Endereço que vai nos links (túnel ou WEB_PUBLIC_URL) */
    webPublicUrl: string
}

export const DEMO_OFFICE_NAME = 'Escritório Demo · Advocacia Previdenciária'

@Injectable()
export class DemoHostService {
    private readonly logger = new Logger('DemoHost')
    private secret: string | null = null
    private received: ReceivedWebhook[] = []

    constructor(
        private readonly prisma: PrismaService,
        private readonly messaging: MessagingService,
    ) {}

    private get base() {
        return `http://127.0.0.1:${env().PORT}`
    }

    /** Chamada à API do LíderSign como parceiro (loopback). */
    private async call(path: string, init: RequestInit = {}) {
        return fetch(`${this.base}${path}`, {
            ...init,
            headers: { ...partnerHeaders(), 'Content-Type': 'application/json', ...(init.headers ?? {}) },
            signal: AbortSignal.timeout(15_000),
        })
    }

    async activate(): Promise<Omit<ConnectTenantResponse, 'webhookSecret'>> {
        const startedAt = Date.now()
        const res = await this.call('/v1/partner/tenants', {
            method: 'POST',
            body: JSON.stringify({
                externalId: env().DEMO_TENANT_ID,
                name: DEMO_OFFICE_NAME,
                webhookUrl: `http://localhost:${env().PORT}/demo-host/webhook`,
                starterPack: true,
            }),
        })
        const json = (await res.json()) as ConnectTenantResponse
        if (!res.ok) throw new Error(`Falha ao ativar: HTTP ${res.status}`)
        if (json.created) {
            // Escritório novo: segredo novo, histórico de webhooks e de chamadas zerado
            this.secret = json.webhookSecret ?? null
            this.received = []
            clearCalls()
        }
        logCall({
            direction: 'liderhub-to-lidersign',
            method: 'POST',
            path: '/v1/partner/tenants',
            status: res.status,
            ms: Date.now() - startedAt,
            detail: json.created ? 'Conta do escritório criada, com os modelos de exemplo' : 'Conta do escritório reativada',
        })
        const { webhookSecret: _secret, ...rest } = json
        return rest
    }

    async deactivate(): Promise<void> {
        const startedAt = Date.now()
        const path = `/v1/partner/tenants/${encodeURIComponent(env().DEMO_TENANT_ID)}`
        const res = await this.call(path, { method: 'DELETE' })
        logCall({
            direction: 'liderhub-to-lidersign',
            method: 'DELETE',
            path,
            status: res.status,
            ms: Date.now() - startedAt,
            detail: 'Conta do escritório desativada',
        })
        if (!res.ok && res.status !== 404) throw new Error(`Falha ao desativar: HTTP ${res.status}`)
    }

    async status(): Promise<DemoHostStatus> {
        const config = env()
        const base = {
            whatsappProvider: config.WHATSAPP_PROVIDER,
            whatsappConfigured:
                config.WHATSAPP_PROVIDER === 'cloud_api' &&
                Boolean(config.WHATSAPP_PHONE_NUMBER_ID) &&
                Boolean(config.WHATSAPP_ACCESS_TOKEN),
            webPublicUrl: publicUrl(),
            tunnel: isTunnelActive(),
        }
        const tenantRes = await this.call(`/v1/partner/tenants/${encodeURIComponent(config.DEMO_TENANT_ID)}`)
        if (!tenantRes.ok) return { active: false, tenant: null, templatesCount: 0, ...base }
        const tenant = (await tenantRes.json()) as TenantDto
        if (!tenant.active) return { active: false, tenant, templatesCount: 0, ...base }
        const templatesRes = await this.call('/v1/templates')
        const templates = templatesRes.ok ? ((await templatesRes.json()) as TemplateDto[]) : []
        return { active: true, tenant, templatesCount: templates.length, ...base }
    }

    /** Configurações › WhatsApp: manda uma mensagem de teste para conferir a conexão com a Meta. */
    async whatsappTest(phone: string): Promise<{ status: MessageStatus; error: string | null; provider: string }> {
        if (!isValidBrPhone(phone)) throw new BadRequestException('Informe o celular com DDD.')
        const tenant = await this.prisma.tenant.findUnique({ where: { externalId: env().DEMO_TENANT_ID } })
        if (!tenant?.active) throw new ConflictException('Ative o escritório de demonstração antes do teste.')
        const message = await this.messaging.send({
            tenantId: tenant.id,
            envelopeId: null,
            to: normalizeBrPhone(phone),
            kind: 'TEST',
            body: 'Teste do LíderSign: a conexão com o WhatsApp está funcionando.',
        })
        return { status: message.status as MessageStatus, error: message.error, provider: message.provider }
    }

    private async fetchSecret(): Promise<string | null> {
        const res = await this.call(
            `/v1/partner/tenants/${encodeURIComponent(env().DEMO_TENANT_ID)}/webhook-secret`,
        )
        if (!res.ok) return null
        const json = (await res.json()) as { webhookSecret: string }
        this.secret = json.webhookSecret
        return this.secret
    }

    private static check(secret: string, header: string, rawBody: string): { ok: boolean; reason: string | null } {
        const parts = Object.fromEntries(
            header.split(',').map((part) => {
                const [key, ...value] = part.trim().split('=')
                return [key, value.join('=')]
            }),
        ) as { t?: string; v1?: string }
        const timestamp = Number(parts.t)
        if (!parts.t || !parts.v1 || !Number.isFinite(timestamp)) return { ok: false, reason: 'cabeçalho inválido' }
        if (Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) {
            return { ok: false, reason: 'fora da janela de 5 minutos' }
        }
        const expected = createHmac('sha256', secret).update(`${parts.t}.${rawBody}`).digest()
        const given = Buffer.from(parts.v1, 'hex')
        if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
            return { ok: false, reason: 'HMAC não confere' }
        }
        return { ok: true, reason: null }
    }

    /** Recebe um webhook. Valida o HMAC; se o segredo em cache estiver velho (reset da demo), busca de novo. */
    async receive(rawBody: Buffer, signature: string | undefined): Promise<ReceivedWebhook> {
        const body = rawBody.toString('utf8')
        let verified = false
        let reason: string | null = 'sem assinatura'
        if (signature) {
            let secret = this.secret ?? (await this.fetchSecret())
            let result = secret ? DemoHostService.check(secret, signature, body) : { ok: false, reason: 'sem segredo' }
            if (!result.ok && result.reason === 'HMAC não confere') {
                secret = await this.fetchSecret()
                if (secret) result = DemoHostService.check(secret, signature, body)
            }
            verified = result.ok
            reason = result.reason
        }
        let payload: WebhookPayload | null = null
        try {
            payload = JSON.parse(body) as WebhookPayload
        } catch {
            payload = null
        }
        const item: ReceivedWebhook = {
            receivedAt: new Date().toISOString(),
            verified,
            event: payload?.event ?? null,
            payload,
            reason,
        }
        this.received = [item, ...this.received].slice(0, MAX_RECEIVED)
        logCall({
            direction: 'lidersign-to-liderhub',
            method: 'POST',
            path: '/demo-host/webhook',
            status: 200,
            ms: 0,
            detail: `${item.event ?? 'evento'} · ${verified ? 'HMAC válido' : `recusado (${reason})`}`,
        })
        if (!verified) this.logger.warn(`Webhook recusado: ${reason}`)
        return item
    }

    list(): ReceivedWebhook[] {
        return this.received
    }
}
