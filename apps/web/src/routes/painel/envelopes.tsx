import { Send } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { EnvelopeTable } from '@/features/envelopes'
import { useDocumentTitle } from '@/lib/use-document-title'

export default function EnvelopesRoute() {
    useDocumentTitle('Envios · Painel')
    return (
        <div className="space-y-8 animate-enter">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-[28px] font-bold tracking-[-0.03em]">Envios</h1>
                    <p className="mt-1.5 text-muted">Documentos enviados para assinatura e o andamento de cada um.</p>
                </div>
                <Button asChild>
                    <Link to="/painel/enviar">
                        <Send aria-hidden /> Enviar para assinatura
                    </Link>
                </Button>
            </div>
            <EnvelopeTable />
        </div>
    )
}
