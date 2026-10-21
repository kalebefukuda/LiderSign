import { useParams } from 'react-router'

import { ContractDetail } from '@/features/contracts'

export default function ContractRoute() {
    const { id = '' } = useParams()
    return (
        <div className="mx-auto w-full max-w-[1120px] px-5 py-8 sm:px-8 sm:py-10">
            <ContractDetail id={id} />
        </div>
    )
}
