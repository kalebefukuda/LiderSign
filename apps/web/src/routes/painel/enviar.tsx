import { SendForm } from '@/features/envelopes'
import { useDocumentTitle } from '@/lib/use-document-title'

export default function SendRoute() {
    useDocumentTitle('Enviar para assinatura · Painel')
    return (
        <div className="max-w-3xl space-y-10 animate-enter">
            <div>
                <h1 className="text-[28px] font-bold tracking-[-0.03em]">Enviar para assinatura</h1>
                <p className="mt-1.5 text-muted">
                    Escolha o modelo, diga quem assina e confira os campos. Os dados de exemplo já vêm preenchidos.
                </p>
            </div>
            <SendForm />
        </div>
    )
}
