import { ArrowRight, Compass } from 'lucide-react'
import { Link } from 'react-router'

import { Button, useDocumentTitle } from '@lidersign/ui'

import { SiteHeader } from '@/features/brand'

export default function NotFoundRoute() {
    useDocumentTitle('Página não encontrada')
    return (
        <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-start justify-center px-5 py-24 sm:px-8">
                <span className="flex size-12 items-center justify-center rounded-xl border border-line text-muted">
                    <Compass className="size-5" aria-hidden />
                </span>
                <p className="mt-8 font-mono text-sm text-subtle tabular">404</p>
                <h1 className="mt-2 text-[34px] font-bold leading-tight tracking-[-0.04em]">
                    Esta página não existe
                </h1>
                <p className="mt-3 max-w-[48ch] text-lg leading-relaxed text-muted">
                    Se você recebeu um link de assinatura, confira se ele foi copiado inteiro. Se continuar
                    assim, peça um novo link ao escritório.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                    <Button asChild>
                        <Link to="/v">
                            Verificar um documento <ArrowRight aria-hidden />
                        </Link>
                    </Button>
                </div>
            </main>
        </div>
    )
}
