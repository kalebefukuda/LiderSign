import { ASSURANCE_LEVEL_LABEL, TEMPLATE_KIND_LABEL, type TemplateDto } from '@lidersign/shared'
import { ChevronRight, FileText, RefreshCw } from 'lucide-react'
import { Link } from 'react-router'

import { Badge, Button, Skeleton, EmptyState, ErrorNotice, formatDateTime, useResource } from '@lidersign/ui'

import { templatesApi } from '../api'

export function TemplateList() {
    const { data, error, loading, reload } = useResource<TemplateDto[]>(templatesApi.listUrl)

    if (loading && !data) {
        return (
            <div className="divide-y divide-line rounded-2xl border border-line">
                {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-center gap-4 px-5 py-5">
                        <Skeleton className="size-10 rounded-xl" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-3 w-1/4" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (error && !data) {
        return (
            <ErrorNotice
                message={error.message}
                action={
                    <Button variant="secondary" size="sm" onClick={() => void reload()}>
                        <RefreshCw aria-hidden /> Tentar de novo
                    </Button>
                }
            />
        )
    }

    if (!data?.length) {
        return (
            <EmptyState
                icon={<FileText />}
                title="Nenhum modelo ainda"
                description="Envie um contrato que você já usa. O LíderSign marca os dados do cliente como campos para você revisar."
                action={
                    <Button asChild>
                        <Link to="/painel/modelos/novo">Importar contrato</Link>
                    </Button>
                }
            />
        )
    }

    return (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
            {data.map((template) => (
                <li key={template.id}>
                    <Link
                        to={`/painel/modelos/${template.id}`}
                        className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface/60"
                    >
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-white text-muted">
                            <FileText className="size-[18px]" aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{template.name}</p>
                            <p className="mt-0.5 text-sm text-muted tabular">
                                {template.variables.length} campos · versão {template.version} · atualizado em{' '}
                                {formatDateTime(template.updatedAt)}
                            </p>
                        </div>
                        <div className="hidden items-center gap-2 sm:flex">
                            <Badge>{TEMPLATE_KIND_LABEL[template.kind]}</Badge>
                            <Badge tone={template.assuranceLevel === 'REFORCADO' ? 'brand' : 'neutral'}>
                                {ASSURANCE_LEVEL_LABEL[template.assuranceLevel]}
                            </Badge>
                        </div>
                        <ChevronRight
                            className="size-4 text-subtle transition-transform duration-200 group-hover:translate-x-0.5"
                            aria-hidden
                        />
                    </Link>
                </li>
            ))}
        </ul>
    )
}
