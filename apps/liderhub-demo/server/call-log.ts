export type CallLogEntry = {
    at: string
    direction: 'liderhub-to-lidersign' | 'lidersign-to-liderhub'
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

export function listCalls() {
    return entries
}

export function clearCalls() {
    entries = []
}
