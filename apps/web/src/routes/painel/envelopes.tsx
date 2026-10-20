import { FilePlus2 } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { EnvelopeTable } from '@/features/envelopes'
import { useDocumentTitle } from '@/lib/use-document-title'

export default function EnvelopesRoute() {
    useDocumentTitle('Documentos · LíderSign')
    return (
        <div className="space-y-8 animate-enter">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-[28px] font-bold tracking-[-0.03em]">Documentos</h1>
                    <p className="mt-1.5 text-muted">
                        Contratos enviados para assinatura e o andamento de cada um.
                    </p>
                </div>
                <Button asChild variant="secondary">
                    <Link to="/painel/enviar">
                        <FilePlus2 aria-hidden /> Envio avulso
                    </Link>
                </Button>
            </div>
            <EnvelopeTable />
        </div>
    )
}
