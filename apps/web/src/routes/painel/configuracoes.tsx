import { SettingsPage } from '@/features/demo'
import { useDocumentTitle } from '@/lib/use-document-title'

export default function SettingsRoute() {
    useDocumentTitle('Configurações · Painel')
    return <SettingsPage />
}
