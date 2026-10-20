import { useParams } from 'react-router'

import { SigningFlow } from '@/features/signing'
import { useDocumentTitle } from '@/lib/use-document-title'

export default function SignRoute() {
    useDocumentTitle('Assinar documento')
    const { token = '' } = useParams()
    return <SigningFlow token={token} />
}
