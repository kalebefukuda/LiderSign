import { parseTemplate, type TemplateSpan } from '@lidersign/shared'
import * as React from 'react'

function renderSpans(spans: TemplateSpan[]) {
    return spans.map((span, index) =>
        span.bold ? (
            <strong key={index} className="font-semibold text-ink">
                {span.text}
            </strong>
        ) : (
            <React.Fragment key={index}>{span.text}</React.Fragment>
        ),
    )
}

/** Documento legível no celular: mantém títulos, negrito e listas do modelo. */
export function DocumentText({ body }: { body: string }) {
    const blocks = React.useMemo(() => parseTemplate(body), [body])

    return (
        <article className="space-y-4 text-[16px] leading-[1.7] text-ink/90">
            {blocks.map((block, index) => {
                if (block.type === 'hr') return <hr key={index} className="border-line" />
                if (block.type === 'h1')
                    return (
                        <h2
                            key={index}
                            className="text-[17px] font-bold uppercase leading-snug tracking-[0.01em] text-ink"
                        >
                            {renderSpans(block.spans)}
                        </h2>
                    )
                if (block.type === 'h2')
                    return (
                        <h3 key={index} className="pt-2 text-[16px] font-semibold text-ink">
                            {renderSpans(block.spans)}
                        </h3>
                    )
                if (block.type === 'li')
                    return (
                        <p key={index} className="flex gap-2.5 pl-1">
                            <span aria-hidden className="text-subtle">
                                •
                            </span>
                            <span>{renderSpans(block.spans)}</span>
                        </p>
                    )
                return <p key={index}>{renderSpans(block.spans)}</p>
            })}
        </article>
    )
}
