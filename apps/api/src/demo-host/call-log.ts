/**
 * DEMONSTRAÇÃO APENAS. Registro em memória das chamadas entre a "LíderHub" e o LíderSign,
 * para a tela de integração mostrar o back funcionando. Só ações (sem as consultas de leitura).
 */

export type CallDirection = 'liderhub-to-lidersign' | 'lidersign-to-liderhub'

export type CallLogEntry = {
    at: string
    direction: CallDirection
    method: string
    path: string
    status: number
    ms: number
    detail: string | null
}

const MAX_ENTRIES = 40
let entries: CallLogEntry[] = []

export function logCall(entry: Omit<CallLogEntry, 'at'>) {
    entries = [{ at: new Date().toISOString(), ...entry }, ...entries].slice(0, MAX_ENTRIES)
}

export function listCalls(): CallLogEntry[] {
    return entries
}

export function clearCalls() {
    entries = []
}
