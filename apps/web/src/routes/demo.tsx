import { DemoPage } from '@/features/demo'
import { useDocumentTitle } from '@/lib/use-document-title'

export default function DemoRoute() {
    useDocumentTitle('Demonstração')
    return <DemoPage />
}
