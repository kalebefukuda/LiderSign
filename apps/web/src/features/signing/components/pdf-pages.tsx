import * as React from 'react'

import { Skeleton } from '@/components/ui/primitives'

type State = { kind: 'loading' } | { kind: 'ready'; pages: number } | { kind: 'error' }

/**
 * As páginas do PDF que será assinado, do jeito que ele é: o mesmo arquivo que vai para o selo.
 * pdf.js carrega sob demanda, só nesta etapa.
 */
export function PdfPages({ url, onError }: { url: string; onError?: () => void }) {
    const container = React.useRef<HTMLDivElement>(null)
    const [state, setState] = React.useState<State>({ kind: 'loading' })
    const onErrorRef = React.useRef(onError)
    onErrorRef.current = onError

    React.useEffect(() => {
        let cancelled = false
        let destroy: (() => void) | undefined
        const host = container.current
        if (!host) return

        ;(async () => {
            // Build "legacy": traz polyfills e roda nos celulares mais antigos dos clientes
            const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
            const worker = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')
            pdfjs.GlobalWorkerOptions.workerSrc = worker.default
            const task = pdfjs.getDocument({ url, withCredentials: false })
            destroy = () => void task.destroy()
            const doc = await task.promise
            if (cancelled) return
            host.replaceChildren()
            const width = host.clientWidth || 360
            const ratio = Math.min(window.devicePixelRatio || 1, 2)
            for (let number = 1; number <= doc.numPages; number += 1) {
                const page = await doc.getPage(number)
                if (cancelled) return
                const viewport = page.getViewport({ scale: (width / page.getViewport({ scale: 1 }).width) * ratio })
                const canvas = document.createElement('canvas')
                canvas.width = Math.floor(viewport.width)
                canvas.height = Math.floor(viewport.height)
                canvas.className = 'block h-auto w-full rounded-lg border border-line bg-white'
                canvas.setAttribute('role', 'img')
                canvas.setAttribute('aria-label', `Página ${number} de ${doc.numPages}`)
                host.appendChild(canvas)
                await page.render({ canvas, viewport }).promise
                if (number === 1 && !cancelled) setState({ kind: 'ready', pages: doc.numPages })
            }
        })().catch(() => {
            if (cancelled) return
            setState({ kind: 'error' })
            onErrorRef.current?.()
        })

        return () => {
            cancelled = true
            destroy?.()
        }
    }, [url])

    return (
        <div>
            {state.kind === 'loading' ? (
                <div className="space-y-3" aria-busy="true" aria-label="Carregando o documento">
                    <Skeleton className="aspect-[1/1.414] w-full rounded-lg" />
                </div>
            ) : null}
            <div ref={container} className="space-y-3" />
        </div>
    )
}
