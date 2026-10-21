import { FileUp } from 'lucide-react'
import { Link } from 'react-router'

import { Button, useDocumentTitle } from '@lidersign/ui'

import { TemplateList } from '@/features/templates'

export default function TemplatesRoute() {
    useDocumentTitle('Modelos')
    return (
        <div className="space-y-8 animate-enter">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-[28px] font-bold tracking-[-0.03em]">Modelos</h1>
                    <p className="mt-1.5 max-w-[60ch] text-muted">
                        Contratos e procurações com os campos que o agente preenche a partir da conversa.
                    </p>
                </div>
                <Button asChild>
                    <Link to="/painel/modelos/novo">
                        <FileUp aria-hidden /> Importar contrato
                    </Link>
                </Button>
            </div>
            <TemplateList />
        </div>
    )
}
