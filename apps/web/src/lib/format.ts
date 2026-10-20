const TIME_ZONE = 'America/Sao_Paulo'

export function formatDateTime(value: string | Date | null | undefined) {
    if (!value) return ''
    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: TIME_ZONE,
    }).format(new Date(value))
}

export function formatDateTimeLong(value: string | Date | null | undefined) {
    if (!value) return ''
    return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: TIME_ZONE,
    }).format(new Date(value))
}

export function formatTime(value: string | Date | null | undefined) {
    if (!value) return ''
    return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TIME_ZONE }).format(
        new Date(value),
    )
}

export function formatTimeSeconds(value: string | Date | null | undefined) {
    if (!value) return ''
    return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: TIME_ZONE,
    }).format(new Date(value))
}

export function todayLong() {
    return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: TIME_ZONE }).format(
        new Date(),
    )
}

export function relativeTime(value: string | Date | null | undefined) {
    if (!value) return ''
    const diff = (Date.now() - new Date(value).getTime()) / 1000
    if (diff < 10) return 'agora'
    if (diff < 60) return `há ${Math.floor(diff)} s`
    if (diff < 3600) return `há ${Math.floor(diff / 60)} min`
    if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`
    return formatDateTime(value)
}

export function shortHash(hash: string | null | undefined, size = 12) {
    if (!hash) return ''
    return hash.length > size ? `${hash.slice(0, size)}…` : hash
}

export function firstName(name: string) {
    return name.trim().split(/\s+/)[0] ?? name
}

export function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
