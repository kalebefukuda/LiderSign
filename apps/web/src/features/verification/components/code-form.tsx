import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/primitives'

export function CodeForm({ defaultValue = '' }: { defaultValue?: string }) {
    const navigate = useNavigate()
    const [code, setCode] = React.useState(defaultValue)
    const [error, setError] = React.useState<string | null>(null)

    return (
        <form
            className="space-y-2"
            onSubmit={(event) => {
                event.preventDefault()
                const value = code.trim().toUpperCase().replace(/\s+/g, '')
                if (value.length < 4) {
                    setError('Digite o código que aparece no rodapé do documento.')
                    return
                }
                navigate(`/v/${encodeURIComponent(value)}`)
            }}
        >
            <label htmlFor="code" className="text-sm font-medium">
                Código de verificação
            </label>
            <div className="flex gap-2">
                <Input
                    id="code"
                    value={code}
                    onChange={(event) => {
                        setCode(event.target.value.toUpperCase())
                        setError(null)
                    }}
                    placeholder="Ex.: K7QX-29PL"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    className="h-12 font-mono text-base tracking-wider"
                />
                <Button type="submit" size="lg" aria-label="Verificar">
                    <span className="hidden sm:inline">Verificar</span>
                    <ArrowRight aria-hidden />
                </Button>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </form>
    )
}
