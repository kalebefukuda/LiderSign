import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import { Kicker } from '@/components/ui/primitives'
import { SiteHeader } from '@/features/brand'
import { useDocumentTitle } from '@/lib/use-document-title'

const ideas = [
    {
        number: '01',
        title: 'Zero configuração',
        text: 'O escritório ativa com um clique dentro da LíderHub. Sem token de API, sem conta externa e sem plano separado por cliente.',
        detail: '1 clique, no lugar de token, ambiente e plano pago',
    },
    {
        number: '02',
        title: 'WhatsApp primeiro',
        text: 'O link chega na conversa que já existe. O cliente confirma um código e assina em poucos passos no celular, sem instalar nada.',
        detail: 'Ouvir o contrato em voz alta, letras grandes e botões fáceis de tocar',
    },
    {
        number: '03',
        title: 'Feito para o juiz',
        text: 'Todo PDF sai selado, com carimbo do tempo, página de evidências e QR para verificação pública da integridade.',
        detail: 'Selo PAdES, trilha com hash encadeado e Lei 14.063/2020',
    },
]

export default function HomePage() {
    useDocumentTitle()
    return (
        <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            <main className="flex-1">
                <section className="mx-auto max-w-6xl px-5 pb-20 pt-20 sm:px-8 sm:pb-28 sm:pt-32">
                    <div className="max-w-3xl animate-enter">
                        <Kicker>LíderSign · desafio LíderHub</Kicker>
                        <h1 className="mt-5 text-[44px] font-bold leading-[1.02] tracking-[-0.045em] text-ink sm:text-[72px]">
                            Assinatura eletrônica nativa da <span className="text-brand">LíderHub</span>
                        </h1>
                        <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-muted sm:text-xl">
                            Zero configuração para o escritório, assinatura pelo WhatsApp para o cliente e um PDF
                            pronto para o processo.
                        </p>
                        <div className="mt-10 flex flex-wrap items-center gap-3">
                            <Button asChild size="lg">
                                <Link to="/demo">
                                    Ver a demonstração
                                    <ArrowRight aria-hidden />
                                </Link>
                            </Button>
                            <Button asChild size="lg" variant="ghost">
                                <Link to="/v">Verificar um documento</Link>
                            </Button>
                        </div>
                    </div>
                </section>

                <section className="border-t border-line bg-surface/60">
                    <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
                        <Kicker>Três ideias</Kicker>
                        <h2 className="mt-4 max-w-2xl text-3xl font-bold tracking-[-0.03em] sm:text-4xl">
                            Menos passos para quem assina, mais prova para quem julga.
                        </h2>
                        <ol className="mt-14 divide-y divide-line border-y border-line">
                            {ideas.map((idea) => (
                                <li
                                    key={idea.number}
                                    className="grid gap-4 py-8 sm:grid-cols-[80px_1fr_minmax(0,300px)] sm:gap-10 sm:py-10"
                                >
                                    <span className="font-mono text-sm text-subtle tabular">{idea.number}</span>
                                    <div>
                                        <h3 className="text-xl font-semibold tracking-[-0.02em]">{idea.title}</h3>
                                        <p className="mt-2 max-w-[60ch] leading-relaxed text-muted">{idea.text}</p>
                                    </div>
                                    <p className="text-sm leading-relaxed text-ink/80 sm:pt-1.5">{idea.detail}</p>
                                </li>
                            ))}
                        </ol>
                    </div>
                </section>

                <section className="mx-auto grid max-w-6xl gap-4 px-5 py-20 sm:grid-cols-2 sm:px-8 sm:py-24">
                    <Link
                        to="/painel"
                        className="group rounded-2xl border border-line p-6 transition-colors duration-200 hover:border-line-strong hover:bg-surface/60"
                    >
                        <p className="font-semibold tracking-[-0.01em]">Painel do escritório</p>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted">
                            Modelos de contrato, envelopes em andamento, trilha de auditoria e downloads.
                        </p>
                        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
                            Abrir painel
                            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </span>
                    </Link>
                    <Link
                        to="/v"
                        className="group rounded-2xl border border-line p-6 transition-colors duration-200 hover:border-line-strong hover:bg-surface/60"
                    >
                        <p className="font-semibold tracking-[-0.01em]">Verificar documento</p>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted">
                            Confira se um PDF é o mesmo que foi assinado, pelo código ou enviando o arquivo.
                        </p>
                        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
                            Verificar
                            <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                        </span>
                    </Link>
                </section>
            </main>
            <footer className="border-t border-line">
                <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
                    <p>Projeto de demonstração para o desafio LíderHub.</p>
                    <p>Modelos e dados de exemplo são fictícios.</p>
                </div>
            </footer>
        </div>
    )
}
