import type { ImportedContractDto } from '@lidersign/shared'

/**
 * Histórico do ZapSign, simulado para a demonstração: o que o escritório mandava antes,
 * por link avulso no ZapSign. Os números seguem o que a LíderHub vê na base (cerca de 1 em 10 fecha).
 * Gerador determinístico por escritório, para a tela não mudar a cada recarga. Nomes fictícios.
 */

const FIRST = [
    'Ana',
    'Benedita',
    'Carlos',
    'Dalva',
    'Edson',
    'Francisca',
    'Geraldo',
    'Helena',
    'Irene',
    'José',
    'Luzia',
    'Manoel',
    'Neide',
    'Osmar',
    'Paulo',
    'Rita',
    'Sebastião',
    'Terezinha',
    'Valdir',
    'Zilda',
]
const LAST = [
    'Alves',
    'Barbosa',
    'Cardoso',
    'Dias',
    'Fernandes',
    'Gomes',
    'Lopes',
    'Machado',
    'Nunes',
    'Oliveira',
    'Pires',
    'Ramos',
    'Silva',
    'Teixeira',
    'Vieira',
]
const TITLES = [
    'Contrato de honorários · BPC/LOAS',
    'Contrato de honorários · Aposentadoria',
    'Procuração ad judicia et extra',
    'Contrato de honorários · Auxílio-doença',
]

const DAY_MS = 24 * 60 * 60 * 1000
export const IMPORTED_COUNT = 60

function seeded(seed: string) {
    let h = 2166136261
    for (const char of seed) h = Math.imul(h ^ char.charCodeAt(0), 16777619)
    return () => {
        h = Math.imul(h ^ (h >>> 15), 2246822507)
        h = Math.imul(h ^ (h >>> 13), 3266489909)
        h ^= h >>> 16
        return (h >>> 0) / 4294967296
    }
}

export function importedContracts(tenantId: string, now = Date.now()): ImportedContractDto[] {
    const random = seeded(`zapsign:${tenantId}`)
    const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)]
    // Distribuição fixa: 10% assinam, 35% abrem e param, o resto nem abre o link
    const plan: ImportedContractDto['status'][] = Array.from({ length: IMPORTED_COUNT }, (_, index) =>
        index < IMPORTED_COUNT * 0.1 ? 'SIGNED' : index < IMPORTED_COUNT * 0.45 ? 'VIEWED' : 'SENT',
    )
    for (let i = plan.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1))
        ;[plan[i], plan[j]] = [plan[j], plan[i]]
    }
    const items: ImportedContractDto[] = plan.map((planned, index) => {
        const sent = now - (3 + Math.floor(random() * 85)) * DAY_MS - Math.floor(random() * DAY_MS)
        const old = sent < now - 30 * DAY_MS
        const status: ImportedContractDto['status'] = planned !== 'SIGNED' && old ? 'EXPIRED' : planned
        const viewed = planned === 'SENT' ? null : sent + Math.floor(random() * 2 * DAY_MS)
        const signed = planned === 'SIGNED' && viewed ? viewed + Math.floor(random() * DAY_MS) : null
        return {
            id: `zs-${(index + 1).toString().padStart(3, '0')}`,
            provider: 'zapsign',
            title: pick(TITLES),
            signerName: `${pick(FIRST)} ${pick(LAST)}`,
            status,
            sentAt: new Date(sent).toISOString(),
            viewedAt: viewed ? new Date(viewed).toISOString() : null,
            signedAt: signed ? new Date(signed).toISOString() : null,
        }
    })
    return items.sort((a, b) => b.sentAt.localeCompare(a.sentAt))
}
