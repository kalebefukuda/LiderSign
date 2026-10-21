import * as React from 'react'

const SUFFIX = 'LíderSign'

/** Título da aba por rota (sem Next, o SPA cuida disso no cliente). */
export function useDocumentTitle(title?: string) {
    React.useEffect(() => {
        document.title = title
            ? `${title} · ${SUFFIX}`
            : `${SUFFIX} · Assinatura eletrônica nativa da LíderHub`
    }, [title])
}
