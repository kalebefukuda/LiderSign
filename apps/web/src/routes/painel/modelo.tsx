import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { useDocumentTitle } from '@lidersign/ui'

import { TemplateEditLoader } from '@/features/templates'

export default function EditTemplateRoute() {
    useDocumentTitle('Editar modelo')
    const { id = '' } = useParams()
    return (
        <div className="space-y-8 animate-enter">
            <div>
                <Link
                    to="/painel/modelos"
                    className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
                >
                    <ArrowLeft className="size-4" /> Modelos
                </Link>
                <h1 className="mt-4 text-[28px] font-bold tracking-[-0.03em]">Editar modelo</h1>
                <p className="mt-1.5 text-muted">
                    Cada alteração salva gera uma nova versão. Documentos já enviados não mudam.
                </p>
            </div>
            <TemplateEditLoader id={id} />
        </div>
    )
}
