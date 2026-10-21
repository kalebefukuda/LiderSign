import { fetchJson } from '@lidersign/ui'

import { CONTRACTS_BASE } from '@/lib/endpoints'

export const contractsApi = {
    importedUrl: `${CONTRACTS_BASE}/imported`,
    nudgeStalled: () =>
        fetchJson<{ count: number; names: string[] }>(`${CONTRACTS_BASE}/nudge-stalled`, { method: 'POST' }),
}
