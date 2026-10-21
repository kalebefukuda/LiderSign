import { Camera, RotateCcw, ShieldCheck } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/http'

import { signingApi } from '../api'

async function compress(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file).catch(() => null)
    if (!bitmap) return file
    const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', 0.82))
}

export function SelfieStep({ token, onCaptured }: { token: string; onCaptured: () => void }) {
    const [preview, setPreview] = React.useState<string | null>(null)
    const [blob, setBlob] = React.useState<Blob | null>(null)
    const [uploading, setUploading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const inputRef = React.useRef<HTMLInputElement>(null)

    React.useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview])

    async function handleFile(file: File) {
        setError(null)
        if (!file.type.startsWith('image/')) {
            setError('Envie uma foto (JPG ou PNG).')
            return
        }
        const compressed = await compress(file)
        setBlob(compressed)
        setPreview(URL.createObjectURL(compressed))
    }

    async function confirm() {
        if (!blob) return
        setUploading(true)
        setError(null)
        try {
            await signingApi.uploadSelfie(token, blob)
            onCaptured()
        } catch (err) {
            setError(errorMessage(err))
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="space-y-5">
            <p className="text-[15px] leading-relaxed text-muted">
                Para documentos como procurações, pedimos uma selfie. Ela entra só no registro de evidências
                deste documento e ajuda a provar que foi você quem assinou.
            </p>
            {preview ? (
                <img
                    src={preview}
                    alt="Prévia da sua selfie"
                    className="mx-auto aspect-[3/4] w-48 rounded-2xl border border-line object-cover"
                />
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    className="flex w-full flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center transition-colors hover:bg-surface"
                >
                    <span className="flex size-12 items-center justify-center rounded-full bg-brand-soft text-brand">
                        <Camera className="size-5" aria-hidden />
                    </span>
                    <span className="text-[15px] font-medium">Tirar selfie</span>
                    <span className="text-sm text-muted">
                        Rosto inteiro, sem óculos escuros, em lugar iluminado
                    </span>
                </button>
            )}
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="user"
                className="sr-only"
                onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void handleFile(file)
                    event.target.value = ''
                }}
            />
            <p className="flex gap-2 text-[13px] leading-relaxed text-muted">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                Ao enviar, você autoriza o uso da foto apenas como prova desta assinatura (LGPD, art. 11). Ela
                não é compartilhada com mais ninguém.
            </p>
            {error ? <p className="text-[15px] text-red-600">{error}</p> : null}
            {preview ? (
                <div className="flex flex-col gap-2">
                    <Button size="lg" className="w-full" loading={uploading} onClick={confirm}>
                        Usar esta foto
                    </Button>
                    <Button
                        variant="ghost"
                        size="lg"
                        className="w-full"
                        onClick={() => inputRef.current?.click()}
                    >
                        <RotateCcw aria-hidden /> Tirar outra
                    </Button>
                </div>
            ) : null}
        </div>
    )
}
