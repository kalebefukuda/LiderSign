import { IntegrationPage } from '@/features/demo'
import { useDocumentTitle } from '@/lib/use-document-title'

export default function IntegrationRoute() {
    useDocumentTitle('Integração com a LíderHub')
    return <IntegrationPage />
}
