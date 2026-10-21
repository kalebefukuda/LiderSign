import { useDocumentTitle } from '@lidersign/ui'

import { LiderHubSim } from '@/features/liderhub'

export default function LiderHubRoute() {
    useDocumentTitle('LíderHub · simulação')
    return <LiderHubSim />
}
