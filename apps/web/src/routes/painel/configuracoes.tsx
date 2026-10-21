import { useDocumentTitle } from '@lidersign/ui'

import { SettingsPage } from '@/features/settings'

export default function SettingsRoute() {
    useDocumentTitle('Configurações')
    return (
        <div className="space-y-10 animate-enter">
            <div>
                <h1 className="text-[28px] font-bold tracking-[-0.03em]">Configurações</h1>
                <p className="mt-1.5 max-w-[62ch] text-muted">
                    Como os links chegam ao cliente e por onde saem as mensagens.
                </p>
            </div>
            <SettingsPage />
        </div>
    )
}
