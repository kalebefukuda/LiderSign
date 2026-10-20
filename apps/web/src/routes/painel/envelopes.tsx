import { EnvelopeTable } from '@/features/envelopes'
import { useDocumentTitle } from '@/lib/use-document-title'

export default function EnvelopesRoute() {
    useDocumentTitle('Envelopes · Painel')
    return (
        <div className="space-y-8 animate-enter">
            <div>
                <h1 className="text-[28px] font-bold tracking-[-0.03em]">Envelopes</h1>
                <p className="mt-1.5 text-muted">Documentos enviados para assinatura, com o andamento de cada um.</p>
            </div>
            <EnvelopeTable />
        </div>
    )
}
