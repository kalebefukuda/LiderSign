import type { CreateTemplateInput, TemplateDto, TemplateImportResponse } from '@lidersign/shared'

import { fetchJson } from '@lidersign/ui'

import { enc, API_BASE } from '@/lib/endpoints'

export const TEMPLATES_CHANGED = 'liderhub:modelos-alterados'

export const templatesApi = {
    listUrl: `${API_BASE}/templates`,
    itemUrl: (id: string) => `${API_BASE}/templates/${enc(id)}`,
    list: () => fetchJson<TemplateDto[]>(`${API_BASE}/templates`, { cache: 'no-store' }),
    save: (draft: CreateTemplateInput, id?: string) =>
        fetchJson<TemplateDto>(id ? `${API_BASE}/templates/${enc(id)}` : `${API_BASE}/templates`, {
            method: id ? 'PATCH' : 'POST',
            body: JSON.stringify(draft),
        }),
    importFile: (file: File) => {
        const form = new FormData()
        form.append('file', file)
        return fetchJson<TemplateImportResponse>(`${API_BASE}/templates/import`, {
            method: 'POST',
            body: form,
        })
    },
}
