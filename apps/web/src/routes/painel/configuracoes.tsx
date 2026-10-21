import { useDocumentTitle } from '@lidersign/ui'

import { PreferencesForm } from '@/features/settings'

export default function SettingsRoute() {
    useDocumentTitle('Configurações')
    return (
        <div className="space-y-12 animate-enter">
            <div>
                <h1 className="text-[28px] font-bold tracking-[-0.03em]">Configurações</h1>
                <p className="mt-1.5 max-w-[62ch] text-muted">
                    Como o link chega ao cliente: a marca do escritório, o prazo para assinar e o lembrete.
                </p>
            </div>
            <PreferencesForm />
        </div>
    )
}
