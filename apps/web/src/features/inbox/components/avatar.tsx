import { cn } from '@lidersign/ui'

const PALETTE = [
    'bg-orange-100 text-orange-800',
    'bg-emerald-100 text-emerald-800',
    'bg-sky-100 text-sky-800',
    'bg-violet-100 text-violet-800',
    'bg-rose-100 text-rose-800',
    'bg-amber-100 text-amber-900',
]

function tone(seed: string) {
    let hash = 0
    for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
    return PALETTE[hash % PALETTE.length]
}

export function Avatar({
    initials,
    seed,
    size = 'md',
    whatsapp,
}: {
    initials: string
    seed: string
    size?: 'sm' | 'md'
    whatsapp?: boolean
}) {
    return (
        <span className="relative inline-flex shrink-0 self-start">
            <span
                className={cn(
                    'flex items-center justify-center rounded-full font-semibold',
                    size === 'sm' ? 'size-8 text-[11px]' : 'size-10 text-xs',
                    tone(seed),
                )}
            >
                {initials}
            </span>
            {whatsapp ? (
                <span
                    aria-hidden
                    className="absolute -bottom-0.5 -right-0.5 flex size-3.5 items-center justify-center rounded-full border-2 border-white bg-[#25d366]"
                />
            ) : null}
        </span>
    )
}
