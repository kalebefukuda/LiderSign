import type { CompleteSigningInput } from '@lidersign/shared'
import { PenLine, Type } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/primitives'
import { cn } from '@/lib/cn'
import { errorMessage } from '@/lib/http'

import { signingApi } from '../api'
import { SignatureCanvas, type SignatureCanvasHandle } from './signature-canvas'

type Mode = 'typed' | 'drawn'

export function SignStep({
    token,
    signerName,
    onSigned,
}: {
    token: string
    signerName: string
    onSigned: (verificationCode: string) => void
}) {
    const [mode, setMode] = React.useState<Mode>('typed')
    const [typedName, setTypedName] = React.useState(signerName)
    const [editing, setEditing] = React.useState(false)
    const [drawnEmpty, setDrawnEmpty] = React.useState(true)
    const [submitting, setSubmitting] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const canvasRef = React.useRef<SignatureCanvasHandle>(null)

    const ready = mode === 'drawn' ? !drawnEmpty : typedName.trim().length >= 3

    async function submit() {
        setError(null)
        let signature: CompleteSigningInput['signature']
        if (mode === 'drawn') {
            const imageDataUrl = canvasRef.current?.toDataUrl()
            if (!imageDataUrl) {
                setError('Desenhe sua assinatura na área acima.')
                return
            }
            signature = { type: 'drawn', imageDataUrl }
        } else {
            signature = { type: 'typed', typedName: typedName.trim() }
        }
        setSubmitting(true)
        try {
            const result = await signingApi.complete(token, { signature, consent: true })
            onSigned(result.verificationCode)
        } catch (err) {
            setError(errorMessage(err))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-5">
            {mode === 'typed' ? (
                <div className="space-y-3">
                    <div
                        className="flex h-32 items-center justify-center rounded-2xl border border-line bg-white px-5"
                        aria-label="Sua assinatura"
                    >
                        <span
                            className={cn(
                                'text-center font-serif italic leading-tight tracking-[-0.01em] text-ink',
                                typedName.trim().length > 22 ? 'text-[24px]' : 'text-[32px]',
                            )}
                        >
                            {typedName.trim() || 'Seu nome'}
                        </span>
                    </div>
                    {editing ? (
                        <div className="space-y-1.5">
                            <label htmlFor="typed-name" className="text-sm font-medium">
                                Seu nome completo
                            </label>
                            <Input
                                id="typed-name"
                                value={typedName}
                                onChange={(event) => setTypedName(event.target.value)}
                                autoComplete="name"
                                className="h-12 text-base"
                            />
                        </div>
                    ) : null}
                    <div className="flex flex-wrap gap-x-5 gap-y-2 text-[15px]">
                        {!editing ? (
                            <button
                                type="button"
                                onClick={() => setEditing(true)}
                                className="font-medium text-brand"
                            >
                                Corrigir o nome
                            </button>
                        ) : null}
                        <button
                            type="button"
                            onClick={() => setMode('drawn')}
                            className="inline-flex items-center gap-1.5 font-medium text-brand"
                        >
                            <PenLine className="size-4" aria-hidden /> Prefiro desenhar
                        </button>
                    </div>
                </div>
            ) : (
                <div className="space-y-3">
                    <SignatureCanvas ref={canvasRef} onChange={(empty) => setDrawnEmpty(empty)} />
                    <button
                        type="button"
                        onClick={() => setMode('typed')}
                        className="inline-flex items-center gap-1.5 text-[15px] font-medium text-brand"
                    >
                        <Type className="size-4" aria-hidden /> Usar meu nome digitado
                    </button>
                </div>
            )}

            {error ? (
                <p className="text-[15px] text-red-600" role="alert">
                    {error}
                </p>
            ) : null}

            <div className="sticky bottom-0 -mx-5 border-t border-line bg-white px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-4">
                <p className="mb-3 text-center text-[13px] leading-relaxed text-muted">
                    Ao tocar em Assinar, você declara que leu o documento e concorda em assiná-lo
                    eletronicamente.
                </p>
                <Button size="lg" className="w-full" disabled={!ready} loading={submitting} onClick={submit}>
                    Assinar
                </Button>
            </div>
        </div>
    )
}
