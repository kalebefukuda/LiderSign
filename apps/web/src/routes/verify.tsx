import { Kicker } from '@/components/ui/primitives'
import { SiteHeader } from '@/features/brand'
import { CodeForm, FileCheck } from '@/features/verification'
import { useDocumentTitle } from '@/lib/use-document-title'

export default function VerifyRoute() {
    useDocumentTitle('Verificar documento')
    return (
        <div className="min-h-dvh">
            <SiteHeader />
            <main className="mx-auto max-w-2xl px-5 pb-24 pt-14 sm:px-8 sm:pt-24">
                <div className="animate-enter">
                    <Kicker>Verificação pública</Kicker>
                    <h1 className="mt-4 text-[34px] font-bold leading-[1.08] tracking-[-0.04em] sm:text-[44px]">
                        Este documento é autêntico?
                    </h1>
                    <p className="mt-4 max-w-[56ch] text-lg leading-relaxed text-muted">
                        Digite o código que aparece no rodapé do PDF, ou envie o arquivo para conferir se ele é idêntico
                        ao que foi assinado.
                    </p>
                </div>
                <div className="mt-12 space-y-12">
                    <CodeForm />
                    <div className="flex items-center gap-4 text-sm text-subtle">
                        <span className="h-px flex-1 bg-line" /> ou confira o arquivo <span className="h-px flex-1 bg-line" />
                    </div>
                    <FileCheck />
                </div>
            </main>
        </div>
    )
}
