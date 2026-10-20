import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router'

import { TemplateEditLoader } from '@/features/templates'
import { useDocumentTitle } from '@/lib/use-document-title'

export default function EditTemplateRoute() {
    useDocumentTitle('Editar modelo · Painel')
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
