import { Kicker } from '@/components/ui/primitives'
import { SiteHeader } from '@/features/brand'
import { IntegrationPage, SettingsPage } from '@/features/demo'
import { useDocumentTitle } from '@/lib/use-document-title'

/** Fora do produto: como a LíderHub integra, registro das chamadas, MCP e configuração da demo. */
export default function DevelopersRoute() {
    useDocumentTitle('Para desenvolvedores')
    return (
        <div className="min-h-dvh">
            <SiteHeader />
            <main className="mx-auto max-w-5xl px-5 pb-24 pt-12 sm:px-8 sm:pt-16">
                <div className="max-w-2xl animate-enter">
                    <Kicker>Para desenvolvedores</Kicker>
                    <h1 className="mt-3 text-[32px] font-bold leading-tight tracking-[-0.035em]">
                        Como a LíderHub usa o LíderSign
                    </h1>
                    <p className="mt-3 text-[16px] leading-relaxed text-muted">
                        O escritório não vê esta página. A LíderHub fala com o LíderSign por API, com uma
                        chave de parceiro guardada no servidor dela: o escritório não cria conta nem cola
                        token.
                    </p>
                </div>
                <div className="mt-14 space-y-16">
                    <IntegrationPage />
                    <SettingsPage />
                </div>
            </main>
        </div>
    )
}
