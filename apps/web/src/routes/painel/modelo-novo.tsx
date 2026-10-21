import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'

import { useDocumentTitle } from '@lidersign/ui'

import { TemplateImport } from '@/features/templates'

export default function NewTemplateRoute() {
    useDocumentTitle('Novo modelo')
    return (
        <div className="space-y-8 animate-enter">
            <div>
                <Link
                    to="/painel/modelos"
                    className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
                >
                    <ArrowLeft className="size-4" /> Modelos
                </Link>
                <h1 className="mt-4 text-[28px] font-bold tracking-[-0.03em]">Novo modelo</h1>
                <p className="mt-1.5 max-w-[62ch] text-muted">
                    Envie o contrato que o escritório já usa. Os dados do cliente viram campos, e o agente
                    preenche tudo a partir da conversa.
                </p>
            </div>
            <TemplateImport />
        </div>
    )
}
