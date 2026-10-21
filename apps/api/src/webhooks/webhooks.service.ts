import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { Envelope, Prisma, Tenant } from '@prisma/client'
import type { EnvelopeStatus, WebhookEvent, WebhookPayload } from '@lidersign/shared'
import { env } from '../config/env'
import { hmacSha256Hex, randomHex } from '../common/crypto'
import { toWebhookDeliveryDto, verificationUrlFor } from '../common/mappers'
import { EventsService } from '../events/events.service'
import { PrismaService } from '../prisma/prisma.service'

const RETRY_DELAYS_MS = [0, 2_000, 5_000]
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

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

    private isAllowed(url: string): boolean {
        try {
            const parsed = new URL(url)
            if (!['http:', 'https:'].includes(parsed.protocol)) return false
            return env().WEBHOOK_ALLOWED_HOSTS.includes(parsed.hostname.toLowerCase())
        } catch {
            return false
        }
    }

    dispatch(tenant: Tenant, envelope: Envelope, event: WebhookEvent) {
        if (!tenant.webhookUrl) return
        void this.deliver(tenant, envelope, event).catch((error) =>
            this.logger.error(`Falha inesperada no webhook ${event}: ${(error as Error).message}`),
        )
    }

    private async deliver(tenant: Tenant, envelope: Envelope, event: WebhookEvent) {
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
        await this.send(tenant, envelope.id, event, payload)
    }

    async redeliver(tenant: Tenant, deliveryId: string) {
        const previous = await this.prisma.webhookDelivery.findFirst({
            where: { id: deliveryId, tenantId: tenant.id },
        })
        if (!previous) throw new NotFoundException('Entrega não encontrada')
        if (!tenant.webhookUrl) throw new NotFoundException('Nenhum endereço de webhook configurado')
        void this.send(
            tenant,
            previous.envelopeId,
            previous.event as WebhookEvent,
            previous.payload as unknown as WebhookPayload,
        ).catch((error) => this.logger.error(`Falha ao reenviar o webhook: ${(error as Error).message}`))
    }

    private async send(
        tenant: Tenant,
        envelopeId: string | null,
        event: WebhookEvent,
        payload: WebhookPayload,
    ) {
        const url = tenant.webhookUrl as string
        let delivery = await this.prisma.webhookDelivery.create({
            data: {
                tenantId: tenant.id,
                envelopeId,
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
                envelopeId,
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
                    envelopeId,
                    delivery: toWebhookDeliveryDto(delivery),
                })
                if (!ok)
                    this.logger.warn(`Webhook ${event} não entregue após ${attempt + 1} tentativas: ${error}`)
                return
            }
        }
    }
}
