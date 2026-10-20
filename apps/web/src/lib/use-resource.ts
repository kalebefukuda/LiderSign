import * as React from 'react'

import { fetchJson, HttpError } from './http'

type ResourceState<T> = {
    data: T | undefined
    error: HttpError | null
    loading: boolean
    reload: () => Promise<void>
    setData: React.Dispatch<React.SetStateAction<T | undefined>>
}

/** Busca simples com recarga manual e polling opcional (sem dependência externa). */
export function useResource<T>(url: string | null, options: { refreshMs?: number } = {}): ResourceState<T> {
    const [data, setData] = React.useState<T | undefined>(undefined)
    const [error, setError] = React.useState<HttpError | null>(null)
    const [loading, setLoading] = React.useState(Boolean(url))
    const urlRef = React.useRef(url)
    urlRef.current = url

    const reload = React.useCallback(async () => {
        const current = urlRef.current
        if (!current) return
        try {
            const result = await fetchJson<T>(current, { cache: 'no-store' })
            if (urlRef.current === current) {
                setData(result)
                setError(null)
            }
        } catch (err) {
            if (urlRef.current === current) {
                setError(err instanceof HttpError ? err : new HttpError(0, 'Algo deu errado.'))
            }
        } finally {
            if (urlRef.current === current) setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        if (!url) {
            setLoading(false)
            return
        }
        setLoading(true)
        void reload()
    }, [url, reload])

    React.useEffect(() => {
        if (!url || !options.refreshMs) return
        const id = window.setInterval(() => {
            if (document.visibilityState === 'visible') void reload()
        }, options.refreshMs)
        return () => window.clearInterval(id)
    }, [url, options.refreshMs, reload])

    return { data, error, loading, reload, setData }
}
