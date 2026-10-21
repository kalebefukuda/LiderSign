import type { EnvelopeDto } from '@lidersign/shared'

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR
export const STALE_AFTER_MS = 2 * DAY

const signedAt = (envelope: EnvelopeDto) => envelope.signedAt ?? envelope.completedAt
const isPending = (envelope: EnvelopeDto) => envelope.status === 'SENT' || envelope.status === 'VIEWED'
const isSigned = (envelope: EnvelopeDto) => envelope.status === 'SIGNED' || envelope.status === 'COMPLETED'

export type EnvelopeMetrics = {
    signedThisMonth: number
    pending: number
    sentLast30: number
    signedLast30: number
    rateLast30: number | null
    averageSignMs: number | null
    stale: EnvelopeDto[]
}

export function envelopeMetrics(envelopes: EnvelopeDto[], now = new Date()): EnvelopeMetrics {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const since30 = now.getTime() - 30 * DAY
    const sent30 = envelopes.filter((item) => new Date(item.sentAt ?? item.createdAt).getTime() >= since30)
    const signed30 = sent30.filter(isSigned)
    const durations = envelopes
        .filter(isSigned)
        .map(
            (item) => new Date(signedAt(item)!).getTime() - new Date(item.sentAt ?? item.createdAt).getTime(),
        )
        .filter((ms) => ms >= 0)

    return {
        signedThisMonth: envelopes.filter((item) => {
            const at = signedAt(item)
            return isSigned(item) && at !== null && new Date(at).getTime() >= monthStart
        }).length,
        pending: envelopes.filter(isPending).length,
        sentLast30: sent30.length,
        signedLast30: signed30.length,
        rateLast30: sent30.length ? signed30.length / sent30.length : null,
        averageSignMs: durations.length
            ? durations.reduce((sum, ms) => sum + ms, 0) / durations.length
            : null,
        stale: envelopes
            .filter(
                (item) =>
                    isPending(item) &&
                    now.getTime() - new Date(item.sentAt ?? item.createdAt).getTime() > STALE_AFTER_MS,
            )
            .sort(
                (a, b) =>
                    new Date(a.sentAt ?? a.createdAt).getTime() - new Date(b.sentAt ?? b.createdAt).getTime(),
            ),
    }
}

const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

export function formatDuration(ms: number) {
    if (ms < HOUR) return `${Math.max(1, Math.round(ms / 60_000))} min`
    if (ms < 2 * DAY) return `${decimal.format(ms / HOUR)} h`
    return `${decimal.format(ms / DAY)} dias`
}

export function formatWaiting(fromIso: string, now = new Date()) {
    const days = Math.floor((now.getTime() - new Date(fromIso).getTime()) / DAY)
    return days <= 1 ? 'há 1 dia' : `há ${days} dias`
}
