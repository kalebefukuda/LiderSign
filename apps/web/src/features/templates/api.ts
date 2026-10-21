import type { CreateTemplateInput, TemplateDto, TemplateImportResponse } from '@lidersign/shared'

import { fetchJson } from '@lidersign/ui'

import { enc, PARTNER_BASE } from '@/lib/endpoints'

export const templatesApi = {
    listUrl: `${PARTNER_BASE}/templates`,
    itemUrl: (id: string) => `${PARTNER_BASE}/templates/${enc(id)}`,
    list: () => fetchJson<TemplateDto[]>(`${PARTNER_BASE}/templates`, { cache: 'no-store' }),
    save: (draft: CreateTemplateInput, id?: string) =>
        fetchJson<TemplateDto>(id ? `${PARTNER_BASE}/templates/${enc(id)}` : `${PARTNER_BASE}/templates`, {
            method: id ? 'PATCH' : 'POST',
            body: JSON.stringify(draft),
        }),
    importFile: (file: File) => {
        const form = new FormData()
        form.append('file', file)
        return fetchJson<TemplateImportResponse>(`${PARTNER_BASE}/templates/import`, {
            method: 'POST',
            body: form,
        })
    },
}
