import type { EnvelopeDto, ImportedContractDto } from './dto'

export const FUNNEL_STAGES = ['SENT', 'VIEWED', 'IDENTITY', 'SIGNED'] as const
export type FunnelStage = (typeof FUNNEL_STAGES)[number]

export const FUNNEL_STAGE_LABEL: Record<FunnelStage, string> = {
    SENT: 'Recebeu',
    VIEWED: 'Abriu',
    IDENTITY: 'Confirmou o CPF',
    SIGNED: 'Assinou',
}

/** Onde a pessoa parou, para quem ainda não assinou. */
export const FUNNEL_STALL_LABEL: Record<FunnelStage, string> = {
    SENT: 'Não abriu',
    VIEWED: 'Abriu, falta o CPF',
    IDENTITY: 'Confirmou o CPF, falta assinar',
    SIGNED: 'Assinou',
}

export type ContractOrigin = 'liderhub' | 'zapsign'

export type FunnelEntry = {
    id: string
    origin: ContractOrigin
    title: string
    signerName: string
    stage: FunnelStage
    open: boolean
    lost: boolean
    sentAt: string
    lastActivityAt: string
}

type StageFields = Pick<EnvelopeDto, 'status' | 'viewedAt' | 'identityConfirmedAt' | 'signedAt'>

export function envelopeStage(envelope: StageFields): FunnelStage {
    if (envelope.signedAt || envelope.status === 'SIGNED' || envelope.status === 'COMPLETED') return 'SIGNED'
    if (envelope.identityConfirmedAt) return 'IDENTITY'
    if (envelope.viewedAt) return 'VIEWED'
    return 'SENT'
}

export function envelopeEntry(envelope: EnvelopeDto): FunnelEntry {
    const stage = envelopeStage(envelope)
    const times = [
        envelope.sentAt ?? envelope.createdAt,
        envelope.viewedAt,
        envelope.identityConfirmedAt,
        envelope.signedAt,
    ].filter((value): value is string => Boolean(value))
    return {
        id: envelope.id,
        origin: 'liderhub',
        title: envelope.title,
        signerName: envelope.signer.name,
        stage,
        open: envelope.status === 'SENT' || envelope.status === 'VIEWED',
        lost: envelope.status === 'EXPIRED' || envelope.status === 'CANCELED',
        sentAt: envelope.sentAt ?? envelope.createdAt,
        lastActivityAt: times.sort().at(-1) ?? envelope.createdAt,
    }
}

export function importedEntry(contract: ImportedContractDto): FunnelEntry {
    const stage: FunnelStage =
        contract.status === 'SIGNED'
            ? 'SIGNED'
            : contract.status === 'VIEWED' || contract.viewedAt
              ? 'VIEWED'
              : 'SENT'
    return {
        id: contract.id,
        origin: 'zapsign',
        title: contract.title,
        signerName: contract.signerName,
        stage,
        open: contract.status === 'SENT' || contract.status === 'VIEWED',
        lost: contract.status === 'EXPIRED',
        sentAt: contract.sentAt,
        lastActivityAt: contract.signedAt ?? contract.viewedAt ?? contract.sentAt,
    }
}

export type FunnelSummary = {
    total: number
    reached: Record<FunnelStage, number>
    open: number
    lost: number
    closingRate: number
}

/** Conta quantos contratos chegaram pelo menos a cada etapa. Cancelados pelo escritório ficam fora. */
export function summarizeFunnel(entries: FunnelEntry[]): FunnelSummary {
    const order = FUNNEL_STAGES
    const reached = Object.fromEntries(order.map((stage) => [stage, 0])) as Record<FunnelStage, number>
    for (const entry of entries) {
        const index = order.indexOf(entry.stage)
        for (let i = 0; i <= index; i++) reached[order[i]] += 1
    }
    const total = entries.length
    return {
        total,
        reached,
        open: entries.filter((entry) => entry.open).length,
        lost: entries.filter((entry) => entry.lost).length,
        closingRate: total ? reached.SIGNED / total : 0,
    }
}
