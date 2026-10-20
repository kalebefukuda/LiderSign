import { Pause, Play, Square, Volume2 } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'

type Status = 'idle' | 'speaking' | 'paused'

/** "Ouvir o contrato": leitura em voz alta pelo próprio celular (sem custo, sem servidor). */
export function ReadAloud({ text, compact = false }: { text: string; compact?: boolean }) {
    const [supported, setSupported] = React.useState(false)
    const [status, setStatus] = React.useState<Status>('idle')

    React.useEffect(() => {
        setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window)
        return () => {
            if ('speechSynthesis' in window) window.speechSynthesis.cancel()
        }
    }, [])

    if (!supported) return null

    function start() {
        const synth = window.speechSynthesis
        synth.cancel()
        const voices = synth.getVoices()
        const voice =
            voices.find((item) => item.lang === 'pt-BR') ?? voices.find((item) => item.lang.toLowerCase().startsWith('pt'))
        // Parágrafos em fila: evita o corte de falas longas em alguns navegadores.
        const chunks = text
            .split(/\n{2,}/)
            .map((chunk) => chunk.trim())
            .filter(Boolean)
        chunks.forEach((chunk, index) => {
            const utterance = new SpeechSynthesisUtterance(chunk)
            utterance.lang = 'pt-BR'
            utterance.rate = 0.95
            if (voice) utterance.voice = voice
            if (index === chunks.length - 1) utterance.onend = () => setStatus('idle')
            synth.speak(utterance)
        })
        setStatus('speaking')
    }

    if (compact) {
        const label = status === 'idle' ? 'Ouvir' : status === 'speaking' ? 'Pausar' : 'Continuar'
        return (
            <span className="inline-flex items-center gap-3">
                <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-[15px] font-medium text-brand"
                    onClick={() => {
                        if (status === 'idle') start()
                        else if (status === 'speaking') {
                            window.speechSynthesis.pause()
                            setStatus('paused')
                        } else {
                            window.speechSynthesis.resume()
                            setStatus('speaking')
                        }
                    }}
                >
                    {status === 'speaking' ? <Pause className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}
                    {label}
                </button>
                {status !== 'idle' ? (
                    <button
                        type="button"
                        aria-label="Parar leitura"
                        className="text-muted"
                        onClick={() => {
                            window.speechSynthesis.cancel()
                            setStatus('idle')
                        }}
                    >
                        <Square className="size-4" aria-hidden />
                    </button>
                ) : null}
            </span>
        )
    }

    if (status === 'idle') {
        return (
            <Button variant="secondary" size="lg" className="w-full" onClick={start}>
                <Volume2 aria-hidden /> Ouvir o contrato
            </Button>
        )
    }

    return (
        <div className="flex gap-2">
            <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => {
                    if (status === 'speaking') {
                        window.speechSynthesis.pause()
                        setStatus('paused')
                    } else {
                        window.speechSynthesis.resume()
                        setStatus('speaking')
                    }
                }}
            >
                {status === 'speaking' ? <Pause aria-hidden /> : <Play aria-hidden />}
                {status === 'speaking' ? 'Pausar leitura' : 'Continuar leitura'}
            </Button>
            <Button
                variant="secondary"
                size="lg"
                aria-label="Parar leitura"
                onClick={() => {
                    window.speechSynthesis.cancel()
                    setStatus('idle')
                }}
            >
                <Square aria-hidden />
            </Button>
        </div>
    )
}
