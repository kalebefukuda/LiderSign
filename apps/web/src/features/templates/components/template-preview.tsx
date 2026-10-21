import { parseTemplate, type TemplateSpan, type TemplateVariable } from '@lidersign/shared'
import * as React from 'react'

import { cn } from '@/lib/cn'

const VAR_SPLIT = /\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g

function renderSpan(span: TemplateSpan, labels: Map<string, string>, index: number) {
    const parts = span.text.split(VAR_SPLIT)
    return (
        <React.Fragment key={index}>
            {parts.map((part, partIndex) =>
                partIndex % 2 === 1 ? (
                    <span
                        key={partIndex}
                        className="mx-0.5 inline-flex items-center rounded-md border border-brand/20 bg-brand-soft px-1.5 py-px align-baseline text-[0.85em] font-medium text-brand"
                        title={`{{${part}}}`}
                    >
                        {labels.get(part) ?? part}
                    </span>
                ) : span.bold ? (
                    <strong key={partIndex} className="font-semibold">
                        {part}
                    </strong>
                ) : (
                    <React.Fragment key={partIndex}>{part}</React.Fragment>
                ),
            )}
        </React.Fragment>
    )
}

/** Pré-visualização do modelo, com as variáveis destacadas como etiquetas. */
export function TemplatePreview({
    body,
    variables = [],
    className,
}: {
    body: string
    variables?: TemplateVariable[]
    className?: string
}) {
    const labels = React.useMemo(
        () => new Map(variables.map((variable) => [variable.key, variable.label])),
        [variables],
    )
    const blocks = React.useMemo(() => parseTemplate(body), [body])

    if (!blocks.length) {
        return <p className={cn('text-sm text-subtle', className)}>A pré-visualização aparece aqui.</p>
    }

    return (
        <article className={cn('space-y-3 text-[14px] leading-relaxed text-ink/90', className)}>
            {blocks.map((block, index) => {
                if (block.type === 'hr') return <hr key={index} className="my-4 border-line" />
                const content = block.spans.map((span, spanIndex) => renderSpan(span, labels, spanIndex))
                if (block.type === 'h1')
                    return (
                        <h3
                            key={index}
                            className="pb-1 text-center text-base font-bold uppercase tracking-[0.02em]"
                        >
                            {content}
                        </h3>
                    )
                if (block.type === 'h2')
                    return (
                        <h4 key={index} className="pt-2 text-[14px] font-semibold">
                            {content}
                        </h4>
                    )
                if (block.type === 'li')
                    return (
                        <p key={index} className="flex gap-2 pl-2">
                            <span aria-hidden className="text-subtle">
                                •
                            </span>
                            <span>{content}</span>
                        </p>
                    )
                return (
                    <p key={index} className="text-pretty">
                        {content}
                    </p>
                )
            })}
        </article>
    )
}
