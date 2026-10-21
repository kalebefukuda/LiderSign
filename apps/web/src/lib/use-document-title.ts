import * as React from 'react'

const SUFFIX = 'LíderSign'

export function useDocumentTitle(title?: string) {
    React.useEffect(() => {
        document.title = title
            ? `${title} · ${SUFFIX}`
            : `${SUFFIX} · Assinatura eletrônica nativa da LíderHub`
    }, [title])
}
