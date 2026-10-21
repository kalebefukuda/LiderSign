import type { PublicVerificationDto } from '@lidersign/shared'
import { SearchX, ServerCrash } from 'lucide-react'
import { useParams } from 'react-router'

import { Button, Skeleton, EmptyState, useDocumentTitle, useResource } from '@lidersign/ui'

import { SiteHeader } from '@/features/brand'
import { CodeForm, FileCheck, VerificationResult, verificationApi } from '@/features/verification'

export default function VerifyCodeRoute() {
    useDocumentTitle('Verificação de documento')
    const { code: rawCode = '' } = useParams()
    const code = decodeURIComponent(rawCode).trim().toUpperCase()
    const { data, error, loading, reload } = useResource<PublicVerificationDto>(
        verificationApi.lookupUrl(code),
    )
    const notFound = error && [400, 404, 422].includes(error.status)

    return (
        <div className="min-h-dvh">
            <SiteHeader />
            <main className="mx-auto max-w-3xl px-5 pb-24 pt-10 sm:px-8 sm:pt-16">
                <div className="animate-enter">
                    {loading && !data ? (
                        <div className="space-y-6">
                            <Skeleton className="h-36 w-full rounded-2xl" />
                            <Skeleton className="h-4 w-2/3" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    ) : data ? (
                        <VerificationResult data={data}>
                            <section aria-labelledby="conferir">
                                <h2 id="conferir" className="text-lg font-semibold tracking-[-0.02em]">
                                    Tem o PDF em mãos?
                                </h2>
                                <p className="mb-5 mt-1.5 text-sm leading-relaxed text-muted">
                                    Envie o arquivo para conferir se ele é exatamente o que foi assinado, sem
                                    nenhuma alteração.
                                </p>
                                <FileCheck expectedCode={data.code} />
                            </section>
                        </VerificationResult>
                    ) : notFound ? (
                        <div className="space-y-8">
                            <EmptyState
                                icon={<SearchX />}
                                title="Nenhum documento com este código"
                                description={
                                    <>
                                        Confira se o código <span className="font-mono text-ink">{code}</span>{' '}
                                        foi digitado igual ao rodapé do PDF. Documentos que não foram
                                        assinados pelo LíderSign não aparecem aqui.
                                    </>
                                }
                            />
                            <CodeForm defaultValue={code} />
                        </div>
                    ) : (
                        <EmptyState
                            icon={<ServerCrash />}
                            title="Não foi possível verificar agora"
                            description="O serviço de verificação não respondeu. Tente de novo em alguns segundos."
                            action={
                                <Button variant="secondary" onClick={() => void reload()}>
                                    Tentar de novo
                                </Button>
                            }
                        />
                    )}
                </div>
            </main>
        </div>
    )
}
