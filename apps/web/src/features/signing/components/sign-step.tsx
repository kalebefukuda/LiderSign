import type { CompleteSigningInput } from '@lidersign/shared'
import { MapPin, PenLine, Type } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/primitives'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/cn'
import { errorMessage } from '@/lib/http'

import { signingApi } from '../api'
import { SignatureCanvas, type SignatureCanvasHandle } from './signature-canvas'

type Mode = 'drawn' | 'typed'
type Geo = { lat: number; lng: number; accuracy?: number }

export function SignStep({
    token,
    signerName,
    onSigned,
}: {
    token: string
    signerName: string
    onSigned: (verificationCode: string) => void
}) {
    const [mode, setMode] = React.useState<Mode>('drawn')
    const [typedName, setTypedName] = React.useState(signerName)
    const [drawnEmpty, setDrawnEmpty] = React.useState(true)
    const [consent, setConsent] = React.useState(false)
    const [geo, setGeo] = React.useState<Geo | null>(null)
    const [geoState, setGeoState] = React.useState<'off' | 'asking' | 'on'>('off')
    const [geoError, setGeoError] = React.useState<string | null>(null)
    const [submitting, setSubmitting] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const canvasRef = React.useRef<SignatureCanvasHandle>(null)

    const hasSignature = mode === 'drawn' ? !drawnEmpty : typedName.trim().length >= 3
    const ready = hasSignature && consent

    function toggleGeo(enabled: boolean) {
        setGeoError(null)
        if (!enabled) {
            setGeo(null)
            setGeoState('off')
            return
        }
        if (!('geolocation' in navigator)) {
            setGeoError('Seu navegador não permite compartilhar a localização.')
            return
        }
        setGeoState('asking')
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setGeo({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: Math.round(position.coords.accuracy),
                })
                setGeoState('on')
            },
            () => {
                setGeoState('off')
                setGeoError('Localização não autorizada. Tudo bem: ela é opcional.')
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
        )
    }

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
            const result = await signingApi.complete(token, {
                signature,
                consent: true,
                ...(geo ? { geolocation: geo } : {}),
            })
            onSigned(result.verificationCode)
        } catch (err) {
            setError(errorMessage(err))
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            <div role="tablist" aria-label="Como assinar" className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1">
                {(
                    [
                        { value: 'drawn', label: 'Desenhar', icon: PenLine },
                        { value: 'typed', label: 'Digitar nome', icon: Type },
                    ] as const
                ).map((option) => (
                    <button
                        key={option.value}
                        role="tab"
                        type="button"
                        aria-selected={mode === option.value}
                        onClick={() => setMode(option.value)}
                        className={cn(
                            'flex h-11 items-center justify-center gap-2 rounded-lg text-[15px] font-medium transition-colors duration-150',
                            mode === option.value
                                ? 'bg-white text-ink shadow-[0_1px_2px_rgba(11,18,32,0.08)]'
                                : 'text-muted hover:text-ink',
                        )}
                    >
                        <option.icon className="size-4" aria-hidden />
                        {option.label}
                    </button>
                ))}
            </div>

            {mode === 'drawn' ? (
                <SignatureCanvas ref={canvasRef} onChange={(empty) => setDrawnEmpty(empty)} />
            ) : (
                <div className="space-y-3">
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
                    <div className="flex h-24 items-center justify-center rounded-xl border border-line bg-white px-4">
                        <span className="truncate font-serif text-[28px] italic tracking-[-0.01em] text-ink">
                            {typedName.trim() || 'Seu nome'}
                        </span>
                    </div>
                </div>
            )}

            <div className="space-y-2 rounded-xl border border-line p-4">
                <div className="flex items-center justify-between gap-4">
                    <label htmlFor="geo" className="flex items-center gap-2 text-[15px]">
                        <MapPin className="size-4 text-muted" aria-hidden />
                        Compartilhar minha localização (opcional)
                    </label>
                    <Switch
                        id="geo"
                        checked={geoState === 'on'}
                        disabled={geoState === 'asking'}
                        onCheckedChange={toggleGeo}
                    />
                </div>
                {geoState === 'asking' ? <p className="text-sm text-muted">Pedindo permissão ao celular…</p> : null}
                {geoState === 'on' ? (
                    <p className="text-sm text-muted">Localização registrada só como evidência desta assinatura.</p>
                ) : null}
                {geoError ? <p className="text-sm text-muted">{geoError}</p> : null}
            </div>

            <label className="flex cursor-pointer gap-3 rounded-xl p-1">
                <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    className="mt-0.5 size-6 shrink-0 cursor-pointer rounded accent-[#2463EB]"
                />
                <span className="text-[15px] leading-relaxed text-ink/85">
                    Li o documento e concordo em assiná-lo eletronicamente. Entendo que esta assinatura tem validade
                    jurídica (Lei 14.063/2020).
                </span>
            </label>

            {error ? <p className="text-[15px] text-red-600">{error}</p> : null}

            <div className="sticky bottom-0 -mx-5 border-t border-line bg-white px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-4">
                <Button size="lg" className="w-full" disabled={!ready} loading={submitting} onClick={submit}>
                    Assinar documento
                </Button>
                {!ready ? (
                    <p className="mt-2 text-center text-[13px] text-muted">
                        {!hasSignature ? 'Faça sua assinatura' : 'Marque a caixa de concordância'} para continuar
                    </p>
                ) : null}
            </div>
        </div>
    )
}
