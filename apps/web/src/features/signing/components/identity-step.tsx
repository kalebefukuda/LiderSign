import { FileText } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/primitives'
import { errorMessage } from '@/lib/http'

import { signingApi } from '../api'

/** 000.000.000-00 enquanto digita. */
function cpfMask(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    return digits
        .replace(/^(\d{3})(\d)/, '$1.$2')
        .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2')
}

type Props = {
    token: string
    firstName: string
    officeName: string
    title: string
    onConfirmed: () => void
}

/** Primeiro passo: a pessoa digita o próprio CPF. Só depois disso o documento aparece. */
export function IdentityStep({ token, firstName, officeName, title, onConfirmed }: Props) {
    const [cpf, setCpf] = React.useState('')
    const [error, setError] = React.useState<string | null>(null)
    const [sending, setSending] = React.useState(false)
    const [notMe, setNotMe] = React.useState(false)
    const complete = cpf.replace(/\D/g, '').length === 11

    async function submit(event: React.FormEvent) {
        event.preventDefault()
        if (!complete) {
            setError('Digite os 11 números do CPF.')
            return
        }
        setSending(true)
        setError(null)
        try {
            await signingApi.confirmIdentity(token, cpf)
            onConfirmed()
        } catch (err) {
            setError(errorMessage(err))
        } finally {
            setSending(false)
        }
    }

    return (
        <form onSubmit={submit} className="mt-3 space-y-6">
            <h1 className="text-[28px] font-bold leading-tight tracking-[-0.035em]">Olá, {firstName}</h1>
            <p className="text-[17px] leading-relaxed text-ink/80">
                <span className="font-semibold text-ink">{officeName}</span> enviou um documento para você assinar.
            </p>
            <div className="flex items-center gap-3 rounded-2xl border border-line px-4 py-4">
                <FileText className="size-5 shrink-0 text-brand" aria-hidden />
                <p className="font-medium leading-snug">{title}</p>
            </div>

            <div className="space-y-2">
                <label htmlFor="cpf" className="block text-[15px] font-medium">
                    Para abrir, digite seu CPF
                </label>
                <Input
                    id="cpf"
                    value={cpf}
                    onChange={(event) => {
                        setCpf(cpfMask(event.target.value))
                        setError(null)
                    }}
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="000.000.000-00"
                    aria-invalid={Boolean(error)}
                    aria-describedby="cpf-help"
                    className="h-14 text-center font-mono text-xl tracking-wider tabular"
                />
                {error ? (
                    <p className="text-[15px] text-red-600" role="alert">
                        {error}
                    </p>
                ) : (
                    <p id="cpf-help" className="text-sm text-muted">
                        Assim só você consegue ver o documento.
                    </p>
                )}
            </div>

            {notMe ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[15px] leading-relaxed text-amber-900">
                    Não assine. Responda no WhatsApp avisando o escritório que este documento chegou para a pessoa errada.
                    Você pode fechar esta página.
                </div>
            ) : null}

            <div className="space-y-2 pt-1">
                <Button type="submit" size="lg" className="w-full" loading={sending} disabled={!complete}>
                    Abrir documento
                </Button>
                <Button type="button" variant="ghost" size="lg" className="w-full" onClick={() => setNotMe(true)}>
                    Não sou {firstName}
                </Button>
            </div>
        </form>
    )
}
