import { useDocumentTitle } from '@lidersign/ui'

import { SendForm } from '@/features/envelopes'

export default function SendRoute() {
    useDocumentTitle('Envio avulso')
    return (
        <div className="max-w-3xl space-y-10 animate-enter">
            <div>
                <h1 className="text-[28px] font-bold tracking-[-0.03em]">Envio avulso</h1>
                <p className="mt-1.5 text-muted">
                    Para quando o cliente não veio de uma conversa da LíderHub. No dia a dia, o contrato sai
                    pela própria conversa.
                </p>
            </div>
            <SendForm />
        </div>
    )
}
