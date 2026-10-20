import type { TemplateDto } from '@lidersign/shared'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/primitives'
import { EmptyState, ErrorNotice } from '@/components/ui/states'
import { useResource } from '@/lib/use-resource'

import { templatesApi } from '../api'
import { TemplateEditor } from './template-editor'

export function TemplateEditLoader({ id }: { id: string }) {
    const { data, error, loading } = useResource<TemplateDto>(templatesApi.itemUrl(id))

    if (loading && !data) {
        return (
            <div className="grid gap-8 lg:grid-cols-[1fr_440px]">
                <Skeleton className="h-[480px] rounded-2xl" />
                <Skeleton className="h-[480px] rounded-2xl" />
            </div>
        )
    }
    if (error?.status === 404) {
        return (
            <EmptyState
                title="Modelo não encontrado"
                description="Ele pode ter sido arquivado ou apagado ao reiniciar a demonstração."
                action={
                    <Button asChild variant="secondary">
                        <Link to="/painel/modelos">Voltar para modelos</Link>
                    </Button>
                }
            />
        )
    }
    if (error || !data) return <ErrorNotice message={error?.message ?? 'Não foi possível abrir o modelo.'} />

    return (
        <TemplateEditor
            templateId={data.id}
            initial={{
                name: data.name,
                kind: data.kind,
                assuranceLevel: data.assuranceLevel,
                body: data.body,
                variables: data.variables,
            }}
        />
    )
}
