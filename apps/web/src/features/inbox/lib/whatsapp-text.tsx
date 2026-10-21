import * as React from 'react'

/** Formatação do WhatsApp: *negrito*, _itálico_ e links clicáveis. Sem HTML cru. */
export function WhatsAppText({ text, linkClassName }: { text: string; linkClassName?: string }) {
    const lines = text.split('\n')
    return (
        <>
            {lines.map((line, index) => (
                <React.Fragment key={index}>
                    {index ? <br /> : null}
                    {format(line, linkClassName)}
                </React.Fragment>
            ))}
        </>
    )
}

function format(line: string, linkClassName?: string): React.ReactNode[] {
    const nodes: React.ReactNode[] = []
    const pattern = /(https?:\/\/[^\s]+)|\*([^*\n]+)\*|_([^_\n]+)_/g
    let last = 0
    let key = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(line))) {
        if (match.index > last) nodes.push(line.slice(last, match.index))
        if (match[1]) {
            const url = match[1].replace(/[).,;]+$/, '')
            const tail = match[1].slice(url.length)
            nodes.push(
                <a
                    key={key++}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className={linkClassName ?? 'break-all text-[#027eb5] underline underline-offset-2'}
                >
                    {url}
                </a>,
            )
            if (tail) nodes.push(tail)
        } else if (match[2]) {
            nodes.push(<strong key={key++}>{match[2]}</strong>)
        } else if (match[3]) {
            nodes.push(<em key={key++}>{match[3]}</em>)
        }
        last = pattern.lastIndex
    }
    if (last < line.length) nodes.push(line.slice(last))
    return nodes
}
