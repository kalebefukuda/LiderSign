import { useParams } from 'react-router'

import { useDocumentTitle } from '@lidersign/ui'

import { SigningFlow } from '@/features/signing'

export default function SignRoute() {
    useDocumentTitle('Assinar documento')
    const { token = '' } = useParams()
    return <SigningFlow token={token} />
}
