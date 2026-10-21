import { Sparkles } from 'lucide-react'

import { cn } from '@lidersign/ui'

import { useAssistant } from '../context'

export function AssistantButton() {
    const { open, setOpen } = useAssistant()
    return (
        <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-pressed={open}
            className={cn(
                'inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors',
                open
                    ? 'border-brand/30 bg-brand-soft text-brand'
                    : 'border-line-strong bg-white text-ink hover:bg-surface',
            )}
        >
            <Sparkles className="size-4 text-brand" aria-hidden />
            <span className="hidden sm:inline">Pergunte ao Assistente</span>
            <span className="sm:hidden">Assistente</span>
        </button>
    )
}

/** Sugestão do Assistente no contexto da página: um clique e ele já resolve. */
export function AssistantHint({
    children,
    prompt,
    file,
    cta,
    className,
}: {
    children: React.ReactNode
    prompt?: string
    file?: boolean
    cta: string
    className?: string
}) {
    const { ask, requestFile, pending } = useAssistant()
    return (
        <div
            className={cn(
                'flex flex-col gap-3 rounded-xl border border-brand/15 bg-brand-soft/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
                className,
            )}
        >
            <p className="flex items-start gap-2.5 text-sm leading-relaxed text-ink/85">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                <span>{children}</span>
            </p>
            <button
                type="button"
                disabled={pending}
                onClick={() => (file ? requestFile() : prompt ? void ask(prompt) : undefined)}
                className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-white px-3 text-sm font-medium text-brand ring-1 ring-brand/20 transition-colors hover:bg-brand-soft disabled:opacity-50"
            >
                {cta}
            </button>
        </div>
    )
}
