import * as React from 'react'
import { Link } from 'react-router'

/** Markdown mínimo e seguro: parágrafos, listas "- ", **negrito** e links internos [texto](/caminho). */
function inline(text: string, onNavigate?: () => void): React.ReactNode[] {
    const nodes: React.ReactNode[] = []
    const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\((\/[A-Za-z0-9/_?=&-]*)\)/g
    let last = 0
    let match: RegExpExecArray | null
    let key = 0
    while ((match = pattern.exec(text))) {
        if (match.index > last) nodes.push(text.slice(last, match.index))
        if (match[1]) {
            nodes.push(
                <strong key={key++} className="font-semibold text-ink">
                    {match[1]}
                </strong>,
            )
        } else {
            nodes.push(
                <Link key={key++} to={match[3]} onClick={onNavigate} className="text-brand hover:underline">
                    {match[2]}
                </Link>,
            )
        }
        last = pattern.lastIndex
    }
    if (last < text.length) nodes.push(text.slice(last))
    return nodes
}

export function RichText({ text, onNavigate }: { text: string; onNavigate?: () => void }) {
    const blocks = text.trim().split(/\n{2,}/)
    return (
        <div className="space-y-3 text-[15px] leading-relaxed text-ink/90">
            {blocks.map((block, index) => {
                const lines = block.split('\n')
                if (lines.every((line) => /^\s*[-•]\s+/.test(line))) {
                    return (
                        <ul key={index} className="list-disc space-y-1.5 pl-5 marker:text-subtle">
                            {lines.map((line, lineIndex) => (
                                <li key={lineIndex}>{inline(line.replace(/^\s*[-•]\s+/, ''), onNavigate)}</li>
                            ))}
                        </ul>
                    )
                }
                return (
                    <p key={index}>
                        {lines.map((line, lineIndex) => (
                            <React.Fragment key={lineIndex}>
                                {lineIndex ? <br /> : null}
                                {inline(line, onNavigate)}
                            </React.Fragment>
                        ))}
                    </p>
                )
            })}
        </div>
    )
}
