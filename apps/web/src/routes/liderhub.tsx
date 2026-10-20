import { LiderHubSim } from '@/features/liderhub'
import { useDocumentTitle } from '@/lib/use-document-title'

export default function LiderHubRoute() {
    useDocumentTitle('LíderHub · simulação')
    return <LiderHubSim />
}
