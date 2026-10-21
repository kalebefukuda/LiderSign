import type { SessionInfoDto } from '@lidersign/shared'
import { ArrowRight, Lock, ShieldCheck } from 'lucide-react'
import * as React from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { Button, Skeleton, errorMessage, useDocumentTitle, useResource } from '@lidersign/ui'

import { Logo } from '@/features/brand'

import { sessionApi } from '../api'

const SAFE_NEXT = /^\/(atendimento|contratos|modelos|configuracoes)(\/[A-Za-z0-9_-]+)*$/

export function LoginScreen() {
    useDocumentTitle('Entrar')
    const info = useResource<SessionInfoDto>(sessionApi.infoUrl)
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const [busy, setBusy] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const next = params.get('next') ?? ''

    async function enter() {
        setBusy(true)
        setError(null)
        try {
            await sessionApi.enterDemo()
            navigate(SAFE_NEXT.test(next) ? next : '/atendimento', { replace: true })
        } catch (err) {
            setError(errorMessage(err))
            setBusy(false)
        }
    }

    return (
        <main className="flex min-h-dvh items-center justify-center bg-[#f7f7f8] px-4 py-16">
            <div className="w-full max-w-[400px] animate-enter">
                <div className="flex justify-center">
                    <Logo />
                </div>
                <div className="mt-8 rounded-2xl border border-line bg-white p-7 sm:p-8">
                    {info.loading && !info.data ? (
                        <div className="space-y-3" aria-busy="true">
                            <Skeleton className="h-7 w-48" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="mt-6 h-11 w-full" />
                        </div>
                    ) : info.data?.loginAvailable ? (
                        <>
                            <h1 className="text-[22px] font-bold tracking-[-0.03em]">Entrar na LíderHub</h1>
                            <p className="mt-2 text-[15px] leading-relaxed text-muted">
                                Demonstração local, sem senha. Você entra como a equipe do escritório{' '}
                                <span className="text-ink">{info.data.officeName}</span>.
                            </p>
                            <Button className="mt-7 w-full" loading={busy} onClick={() => void enter()}>
                                Entrar no escritório <ArrowRight aria-hidden />
                            </Button>
                            {error ? (
                                <p role="alert" className="mt-3 text-sm text-red-700">
                                    {error}
                                </p>
                            ) : null}
                            <p className="mt-6 text-[13px] leading-relaxed text-subtle">
                                Contatos, CPFs e telefones da demonstração são fictícios.
                            </p>
                        </>
                    ) : (
                        <>
                            <span className="flex size-10 items-center justify-center rounded-full bg-surface">
                                <Lock className="size-4 text-muted" aria-hidden />
                            </span>
                            <h1 className="mt-4 text-[22px] font-bold tracking-[-0.03em]">
                                Acesso só no computador da demonstração
                            </h1>
                            <p className="mt-2 text-[15px] leading-relaxed text-muted">
                                Por segurança, a área do escritório não abre por link público. Daqui dá para
                                assinar um documento recebido e conferir a autenticidade de um PDF.
                            </p>
                            <Button asChild variant="secondary" className="mt-7 w-full">
                                <Link to="/v">
                                    <ShieldCheck aria-hidden /> Verificar documento
                                </Link>
                            </Button>
                        </>
                    )}
                </div>
            </div>
        </main>
    )
}
