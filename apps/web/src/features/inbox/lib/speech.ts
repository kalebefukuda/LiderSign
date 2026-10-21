import * as React from 'react'

/**
 * O "áudio" do resumo na demonstração: o navegador lê o texto em português.
 * Em produção, o mesmo texto vira um áudio de voz gerado no servidor e vai como mensagem de áudio.
 */
export function useSpeech() {
    const [playing, setPlaying] = React.useState<string | null>(null)
    const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

    React.useEffect(
        () => () => {
            if (supported) window.speechSynthesis.cancel()
        },
        [supported],
    )

    const stop = React.useCallback(() => {
        if (supported) window.speechSynthesis.cancel()
        setPlaying(null)
    }, [supported])

    const play = React.useCallback(
        (id: string, text: string) => {
            if (!supported) return
            window.speechSynthesis.cancel()
            const utterance = new SpeechSynthesisUtterance(text)
            utterance.lang = 'pt-BR'
            utterance.rate = 0.95
            const voice = window.speechSynthesis
                .getVoices()
                .find(
                    (item) =>
                        item.lang.toLowerCase().startsWith('pt-br') || item.lang.toLowerCase() === 'pt_br',
                )
            if (voice) utterance.voice = voice
            utterance.onend = () => setPlaying((current) => (current === id ? null : current))
            utterance.onerror = () => setPlaying((current) => (current === id ? null : current))
            setPlaying(id)
            window.speechSynthesis.speak(utterance)
        },
        [supported],
    )

    return { playing, play, stop, supported }
}
