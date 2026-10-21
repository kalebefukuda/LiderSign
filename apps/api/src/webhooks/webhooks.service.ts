import { Injectable, Logger } from '@nestjs/common'
import type { Envelope, Prisma, Tenant } from '@prisma/client'
import type { EnvelopeStatus, WebhookEvent, WebhookPayload } from '@lidersign/shared'
import { env } from '../config/env'
import { hmacSha256Hex, randomHex } from '../common/crypto'
import { toWebhookDeliveryDto, verificationUrlFor } from '../common/mappers'
import { EventsService } from '../events/events.service'
import { PrismaService } from '../prisma/prisma.service'

const RETRY_DELAYS_MS = [0, 2_000, 5_000]
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Cabeçalho X-LiderSign-Signature: t=<unix>,v1=<hex>, com v1 = HMAC-SHA256(secret, "<t>.<corpo>"). */
export function signWebhook(secret: string, body: string, timestamp = Math.floor(Date.now() / 1000)): string {
    return `t=${timestamp},v1=${hmacSha256Hex(secret, `${timestamp}.${body}`)}`
}

@Injectable()
export class WebhooksService {
    private readonly logger = new Logger('Webhooks')

    constructor(
        private readonly prisma: PrismaService,
        private readonly events: EventsService,
    ) {}

    /** Proteção contra SSRF (A01:2025): só hosts da lista permitida recebem webhooks. */
    private isAllowed(url: string): boolean {
        try {
            const parsed = new URL(url)
            if (!['http:', 'https:'].includes(parsed.protocol)) return false
            return env().WEBHOOK_ALLOWED_HOSTS.includes(parsed.hostname.toLowerCase())
        } catch {
            return false
        }
    }

    /** Dispara em segundo plano. Não bloqueia quem chamou. */
    dispatch(tenant: Tenant, envelope: Envelope, event: WebhookEvent) {
        if (!tenant.webhookUrl) return
        void this.deliver(tenant, envelope, event).catch((error) =>
            this.logger.error(`Falha inesperada no webhook ${event}: ${(error as Error).message}`),
        )
    }

    private async deliver(tenant: Tenant, envelope: Envelope, event: WebhookEvent) {
        const url = tenant.webhookUrl as string
        const payload: WebhookPayload = {
            id: `evt_${randomHex(12)}`,
            event,
            createdAt: new Date().toISOString(),
            data: {
                envelopeId: envelope.id,
                externalRef: envelope.externalRef,
                status: envelope.status as EnvelopeStatus,
                verificationUrl: verificationUrlFor(envelope.verificationCode),
            },
        }
        let delivery = await this.prisma.webhookDelivery.create({
            data: {
                tenantId: tenant.id,
                envelopeId: envelope.id,
                event,
                url,
                payload: payload as unknown as Prisma.InputJsonValue,
            },
        })

        if (!this.isAllowed(url)) {
            delivery = await this.prisma.webhookDelivery.update({
                where: { id: delivery.id },
                data: { error: 'host não permitido', attempts: 0 },
            })
            this.events.emit(tenant.id, {
                type: 'webhook.delivered',
                envelopeId: envelope.id,
                delivery: toWebhookDeliveryDto(delivery),
            })
            return
        }

        const body = JSON.stringify(payload)
        for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
            await sleep(RETRY_DELAYS_MS[attempt])
            let statusCode: number | null = null
            let error: string | null = null
            try {
                const res = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'LiderSign-Webhooks/1.0',
                        'X-LiderSign-Event': event,
                        'X-LiderSign-Signature': signWebhook(tenant.webhookSecret, body),
                    },
                    body,
                    redirect: 'manual',
                    signal: AbortSignal.timeout(5_000),
                })
                statusCode = res.status
                if (!res.ok) error = `HTTP ${res.status}`
            } catch (err) {
                error = (err as Error).message.slice(0, 300)
            }
            const ok = error === null
            delivery = await this.prisma.webhookDelivery.update({
                where: { id: delivery.id },
                data: {
                    attempts: attempt + 1,
                    statusCode,
                    ok,
                    error,
                    deliveredAt: ok ? new Date() : null,
                },
            })
            if (ok || attempt === RETRY_DELAYS_MS.length - 1) {
                this.events.emit(tenant.id, {
                    type: 'webhook.delivered',
                    envelopeId: envelope.id,
                    delivery: toWebhookDeliveryDto(delivery),
                })
                if (!ok)
                    this.logger.warn(`Webhook ${event} não entregue após ${attempt + 1} tentativas: ${error}`)
                return
            }
        }
    }
}
