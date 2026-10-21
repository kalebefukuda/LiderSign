import type { SessionInfoDto } from '@lidersign/shared'

import { fetchJson } from '@lidersign/ui'

import { SESSION_BASE } from '@/lib/endpoints'

export const sessionApi = {
    infoUrl: SESSION_BASE,
    info: () => fetchJson<SessionInfoDto>(SESSION_BASE, { cache: 'no-store' }),
    enterDemo: () => fetchJson<void>(`${SESSION_BASE}/demo`, { method: 'POST' }),
    resetDemo: () => fetchJson<void>(`${SESSION_BASE}/demo/reset`, { method: 'POST' }),
    logout: () => fetchJson<void>(`${SESSION_BASE}/logout`, { method: 'POST' }),
}
