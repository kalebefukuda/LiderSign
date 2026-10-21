import { ArrowUpRight, LogIn, PowerOff } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'

import { Button, useDocumentTitle, useResource } from '@lidersign/ui'

import { Logo } from '@/features/brand'

import { officeApi, type PartnerInfo } from '../api'

export function AccessScreen({ reason }: { reason: 'session' | 'inactive' }) {
    useDocumentTitle(reason === 'session' ? 'Entrar' : 'Desativado')
    const [params] = useSearchParams()
    const partner = useResource<PartnerInfo>(officeApi.partnerUrl)
    const name = partner.data?.name ?? 'LíderHub'
    const expired = params.get('acesso') === 'expirado'
    const left = params.get('saiu') === '1'

    const title =
        reason === 'inactive'
            ? 'O LíderSign está desativado neste escritório'
            : left
              ? 'Você saiu do LíderSign'
              : expired
                ? 'Este link de acesso já foi usado'
                : `Entre pela ${name}`
    const text =
        reason === 'inactive'
            ? `Os documentos continuam guardados. Para voltar a usar, ative de novo em Integrações, na ${name}.`
            : `O LíderSign abre direto da ${name}, sem senha: em Integrações ou em Contratos, clique em Abrir o LíderSign.`

    return (
        <div className="flex min-h-dvh flex-col bg-white">
            <header className="flex h-16 items-center px-5 sm:px-8">
                <Logo />
            </header>
            <main className="flex flex-1 items-center justify-center px-5 pb-24">
                <div className="w-full max-w-md animate-enter text-center">
                    <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-surface text-muted">
                        {reason === 'inactive' ? (
                            <PowerOff className="size-5" aria-hidden />
                        ) : (
                            <LogIn className="size-5" aria-hidden />
                        )}
                    </span>
                    <h1 className="mt-5 text-2xl font-bold tracking-[-0.03em]">{title}</h1>
                    <p className="mx-auto mt-2 max-w-[42ch] leading-relaxed text-muted">{text}</p>
                    <div className="mt-8 flex flex-col items-center gap-3">
                        {partner.data?.url ? (
                            <Button asChild>
                                <a href={`${partner.data.url}/integracoes`}>
                                    Ir para a {name} <ArrowUpRight aria-hidden />
                                </a>
                            </Button>
                        ) : null}
                        <Link to="/v" className="text-sm text-muted hover:text-ink">
                            Verificar um documento assinado
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    )
}
