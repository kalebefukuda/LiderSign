import { useParams } from 'react-router'

import { EnvelopeDetail } from '@/features/envelopes'
import { useDocumentTitle } from '@/lib/use-document-title'

export default function EnvelopeRoute() {
    useDocumentTitle('Envelope · Painel')
    const { id = '' } = useParams()
    return <EnvelopeDetail id={id} />
}
