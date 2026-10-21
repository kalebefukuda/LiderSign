import { FileUp } from 'lucide-react'
import { Link } from 'react-router'

import { Button, useDocumentTitle } from '@lidersign/ui'

import { AssistantHint } from '@/features/assistant'
import { Page } from '@/features/shell'
import { TemplateList } from '@/features/templates'

export default function TemplatesRoute() {
    useDocumentTitle('Modelos')
    return (
        <Page
            title="Modelos"
            description="Contratos e procurações com os campos que o agente preenche a partir da conversa."
            actions={
                <Button asChild>
                    <Link to="/modelos/novo">
                        <FileUp aria-hidden /> Importar contrato
                    </Link>
                </Button>
            }
        >
            <AssistantHint className="mb-8" file cta="Anexar contrato">
                Tem um contrato em PDF ou Word? Anexe e o Assistente cria o modelo, com os dados do cliente
                marcados como campos.
            </AssistantHint>
            <TemplateList />
        </Page>
    )
}
