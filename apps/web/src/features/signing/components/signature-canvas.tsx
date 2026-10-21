import { Eraser } from 'lucide-react'
import * as React from 'react'
import SignaturePad from 'signature_pad'

export type SignatureCanvasHandle = { toDataUrl: () => string | null; isEmpty: () => boolean }

export const SignatureCanvas = React.forwardRef<
    SignatureCanvasHandle,
    { onChange?: (empty: boolean) => void }
>(function SignatureCanvas({ onChange }, ref) {
    const canvasRef = React.useRef<HTMLCanvasElement>(null)
    const padRef = React.useRef<SignaturePad | null>(null)
    const onChangeRef = React.useRef(onChange)
    onChangeRef.current = onChange
    const [empty, setEmpty] = React.useState(true)

    React.useImperativeHandle(ref, () => ({
        toDataUrl: () =>
            padRef.current && !padRef.current.isEmpty() ? padRef.current.toDataURL('image/png') : null,
        isEmpty: () => padRef.current?.isEmpty() ?? true,
    }))

    React.useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const pad = new SignaturePad(canvas, {
            penColor: '#0B1220',
            minWidth: 0.9,
            maxWidth: 2.6,
            backgroundColor: 'rgba(255,255,255,0)',
        })
        padRef.current = pad
        const update = () => {
            const isEmpty = pad.isEmpty()
            setEmpty(isEmpty)
            onChangeRef.current?.(isEmpty)
        }
        pad.addEventListener('endStroke', update)

        const resize = () => {
            const data = pad.toData()
            const ratio = Math.max(window.devicePixelRatio || 1, 1)
            canvas.width = canvas.offsetWidth * ratio
            canvas.height = canvas.offsetHeight * ratio
            canvas.getContext('2d')?.scale(ratio, ratio)
            pad.clear()
            if (data.length) pad.fromData(data)
        }
        resize()
        const observer = new ResizeObserver(resize)
        observer.observe(canvas)
        return () => {
            observer.disconnect()
            pad.removeEventListener('endStroke', update)
            pad.off()
        }
    }, [])

    return (
        <div className="relative">
            <canvas
                ref={canvasRef}
                className="block h-44 w-full touch-none rounded-xl border border-line-strong bg-white"
                aria-label="Área para desenhar sua assinatura"
            />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-x-6 bottom-10 border-b border-dashed border-line-strong"
            />
            {empty ? (
                <p className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-sm text-subtle">
                    Assine com o dedo acima da linha
                </p>
            ) : (
                <button
                    type="button"
                    onClick={() => {
                        padRef.current?.clear()
                        setEmpty(true)
                        onChangeRef.current?.(true)
                    }}
                    className="absolute right-2 top-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-white/90 px-2.5 text-sm text-muted ring-1 ring-line hover:text-ink"
                >
                    <Eraser className="size-4" aria-hidden /> Limpar
                </button>
            )}
        </div>
    )
})
