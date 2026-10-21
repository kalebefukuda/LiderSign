import { useDocumentTitle } from '@lidersign/ui'

import { ChannelSettings, PreferencesForm } from '@/features/settings'
import { Page } from '@/features/shell'

export default function SettingsRoute() {
    useDocumentTitle('Configurações')
    return (
        <Page
            title="Configurações"
            description="Como o contrato chega ao cliente: a marca do escritório, o prazo para assinar, o lembrete e o canal do WhatsApp."
        >
            <div className="space-y-12">
                <PreferencesForm />
                <ChannelSettings />
            </div>
        </Page>
    )
}
