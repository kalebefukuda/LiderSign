import * as React from 'react'

let config = { suffix: 'LíderSign', fallback: 'LíderSign' }

export function configureDocumentTitle(next: { suffix: string; fallback: string }) {
    config = next
}

export function useDocumentTitle(title?: string) {
    React.useEffect(() => {
        document.title = title ? `${title} · ${config.suffix}` : config.fallback
    }, [title])
}
