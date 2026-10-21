import type { FileCheckResponse, PublicVerificationDto } from '@lidersign/shared'

import { enc, VERIFY_BASE } from '@/lib/endpoints'
import { fetchJson } from '@/lib/http'

export const verificationApi = {
    lookupUrl: (code: string) => `${VERIFY_BASE}/${enc(code)}`,
    lookup: (code: string) =>
        fetchJson<PublicVerificationDto>(`${VERIFY_BASE}/${enc(code)}`, { cache: 'no-store' }),
    checkFile: (file: File) => {
        const form = new FormData()
        form.append('file', file)
        return fetchJson<FileCheckResponse>(`${VERIFY_BASE}/file`, { method: 'POST', body: form })
    },
}
