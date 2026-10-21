import { Injectable } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import type { AuditEventType } from '@lidersign/shared'
import { sha256Hex } from '../common/crypto'
import type { RequestContext } from '../common/request-context'
import { PrismaService } from '../prisma/prisma.service'

export type AuditActor = 'system' | 'signer' | 'partner'

/**
 * JSON com chaves ordenadas. O Postgres (JSONB) reordena as chaves ao gravar,
 * então o hash precisa de uma forma canônica para a cadeia poder ser recalculada depois.
 */
export function canonicalJson(value: unknown): string {
    if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
    if (value instanceof Date) return JSON.stringify(value.toISOString())
    if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item ?? null)).join(',')}]`
    const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`
}

/**
 * Trilha de auditoria append-only com hash encadeado (ISO 27001 A.8.15, LGPD art. 37).
 * hash = sha256(prevHash + type + JSON(data) + createdAt ISO). Alterar um evento quebra todos os seguintes.
 */
@Injectable()
export class AuditService {
    /** Serializa as gravações por envelope para a cadeia não bifurcar. */
    private readonly locks = new Map<string, Promise<unknown>>()

    constructor(private readonly prisma: PrismaService) {}

    static computeHash(prevHash: string | null, type: string, data: unknown, createdAt: Date): string {
        return sha256Hex(`${prevHash ?? ''}${type}${canonicalJson(data ?? {})}${createdAt.toISOString()}`)
    }

    append(
        envelopeId: string,
        type: AuditEventType,
        actor: AuditActor,
        data: Record<string, unknown> = {},
        ctx?: RequestContext,
    ) {
        const previous = this.locks.get(envelopeId) ?? Promise.resolve()
        const next = previous
            .catch(() => undefined)
            .then(async () => {
                const last = await this.prisma.envelopeEvent.findFirst({
                    where: { envelopeId },
                    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
                    select: { hash: true, createdAt: true },
                })
                let createdAt = new Date()
                // garante ordem estrita mesmo com eventos no mesmo milissegundo
                if (last && createdAt.getTime() <= last.createdAt.getTime()) {
                    createdAt = new Date(last.createdAt.getTime() + 1)
                }
                const prevHash = last?.hash ?? null
                const hash = AuditService.computeHash(prevHash, type, data, createdAt)
                return this.prisma.envelopeEvent.create({
                    data: {
                        envelopeId,
                        type,
                        actor,
                        data: data as Prisma.InputJsonValue,
                        ip: ctx?.ip ?? null,
                        userAgent: ctx?.userAgent ?? null,
                        prevHash,
                        hash,
                        createdAt,
                    },
                })
            })
        this.locks.set(envelopeId, next)
        void next.finally(() => {
            if (this.locks.get(envelopeId) === next) this.locks.delete(envelopeId)
        })
        return next
    }

    /** Recalcula a cadeia inteira. true = íntegra. */
    async verifyChain(envelopeId: string): Promise<boolean> {
        const events = await this.prisma.envelopeEvent.findMany({
            where: { envelopeId },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        })
        let prev: string | null = null
        for (const event of events) {
            if (event.prevHash !== prev) return false
            if (AuditService.computeHash(prev, event.type, event.data, event.createdAt) !== event.hash)
                return false
            prev = event.hash
        }
        return true
    }
}
