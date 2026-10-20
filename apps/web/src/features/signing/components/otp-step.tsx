import { MessageCircle } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { errorMessage } from '@/lib/http'

import { signingApi } from '../api'

export function OtpStep({
    token,
    phoneMasked,
    onVerified,
}: {
    token: string
    phoneMasked: string
    onVerified: () => void
}) {
    const [sent, setSent] = React.useState<{ sentTo: string } | null>(null)
    const [code, setCode] = React.useState('')
    const [cooldown, setCooldown] = React.useState(0)
    const [sending, setSending] = React.useState(false)
    const [verifying, setVerifying] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)
    const inputRef = React.useRef<HTMLInputElement>(null)
    const submittedRef = React.useRef('')

    React.useEffect(() => {
        if (cooldown <= 0) return
        const id = window.setTimeout(() => setCooldown((value) => value - 1), 1000)
        return () => window.clearTimeout(id)
    }, [cooldown])

    async function send() {
        setSending(true)
        setError(null)
        try {
            const result = await signingApi.sendOtp(token)
            setSent({ sentTo: result.sentTo })
            setCooldown(result.resendInSeconds ?? 30)
            setCode('')
            submittedRef.current = ''
            window.setTimeout(() => inputRef.current?.focus(), 50)
        } catch (err) {
            setError(errorMessage(err))
        } finally {
            setSending(false)
        }
    }

    const verify = React.useCallback(
        async (value: string) => {
            if (value.length !== 6 || submittedRef.current === value) return
            submittedRef.current = value
            setVerifying(true)
            setError(null)
            try {
                await signingApi.verifyOtp(token, value)
                onVerified()
            } catch (err) {
                setError(errorMessage(err))
                setCode('')
                submittedRef.current = ''
                inputRef.current?.focus()
            } finally {
                setVerifying(false)
            }
        },
        [token, onVerified],
    )

    if (!sent) {
        return (
            <div className="space-y-6">
                <div className="flex gap-3 rounded-xl border border-line bg-surface/70 p-4">
                    <MessageCircle className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
                    <p className="text-[15px] leading-relaxed text-ink/80">
                        Vamos mandar um código de 6 números para o WhatsApp{' '}
                        <span className="font-medium text-ink tabular">{phoneMasked}</span>. É ele que confirma que é você.
                    </p>
                </div>
                {error ? <p className="text-[15px] text-red-600">{error}</p> : null}
                <Button size="lg" className="w-full" loading={sending} onClick={send}>
                    Enviar código no WhatsApp
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-5">
            <p className="text-[15px] leading-relaxed text-muted">
                Enviamos o código para <span className="font-medium text-ink tabular">{sent.sentTo}</span>. Abra o
                WhatsApp e digite aqui.
            </p>
            <label htmlFor="otp" className="sr-only">
                Código de 6 números
            </label>
            <input
                ref={inputRef}
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                disabled={verifying}
                aria-invalid={Boolean(error)}
                onChange={(event) => {
                    const value = event.target.value.replace(/\D/g, '').slice(0, 6)
                    setCode(value)
                    if (value.length === 6) void verify(value)
                }}
                placeholder="••••••"
                className={cn(
                    'h-16 w-full rounded-xl border bg-white text-center font-mono text-3xl tracking-[0.5em] text-ink outline-none transition-colors placeholder:text-line-strong focus:border-brand focus:ring-3 focus:ring-brand/15',
                    error ? 'border-red-400' : 'border-line-strong',
                )}
            />
            {error ? <p className="text-[15px] text-red-600">{error}</p> : null}
            <Button size="lg" className="w-full" loading={verifying} disabled={code.length !== 6} onClick={() => verify(code)}>
                Confirmar código
            </Button>
            <div className="text-center">
                {cooldown > 0 ? (
                    <p className="text-sm text-muted tabular">Reenviar código em {cooldown} s</p>
                ) : (
                    <Button variant="link" onClick={send} disabled={sending}>
                        Não recebi, reenviar código
                    </Button>
                )}
            </div>
        </div>
    )
}
