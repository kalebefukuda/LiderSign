import { useParams } from 'react-router'

import { useDocumentTitle } from '@lidersign/ui'

import { EnvelopeDetail } from '@/features/envelopes'

export default function EnvelopeRoute() {
    useDocumentTitle('Documento')
    const { id = '' } = useParams()
    return <EnvelopeDetail id={id} />
}
