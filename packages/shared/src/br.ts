export function onlyDigits(value: string): string {
    return (value ?? '').replace(/\D/g, '')
}

export function isValidCpf(value: string): boolean {
    const cpf = onlyDigits(value)
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
    const calc = (len: number) => {
        let sum = 0
        for (let i = 0; i < len; i++) sum += Number(cpf[i]) * (len + 1 - i)
        const rest = (sum * 10) % 11
        return rest === 10 ? 0 : rest
    }
    return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10])
}

export function formatCpf(value: string): string {
    const cpf = onlyDigits(value)
    if (cpf.length !== 11) return value
    return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`
}

export function maskCpf(value: string): string {
    const cpf = onlyDigits(value)
    if (cpf.length !== 11) return '***.***.***-**'
    return `***.***.***-${cpf.slice(9)}`
}

export function normalizeBrPhone(value: string): string {
    const digits = onlyDigits(value)
    if (digits.length === 10 || digits.length === 11) return `55${digits}`
    return digits
}

export function isValidBrPhone(value: string): boolean {
    const phone = normalizeBrPhone(value)
    return /^55\d{10,11}$/.test(phone)
}

export function maskPhone(value: string): string {
    const phone = normalizeBrPhone(value)
    if (!/^55\d{10,11}$/.test(phone)) return '(**) *****-****'
    const ddd = phone.slice(2, 4)
    const last = phone.slice(-4)
    const firstDigit = phone.slice(4, 5)
    return `(${ddd}) ${firstDigit}****-${last}`
}

export function formatPhone(value: string): string {
    const phone = normalizeBrPhone(value)
    if (!/^55\d{10,11}$/.test(phone)) return value
    const ddd = phone.slice(2, 4)
    const rest = phone.slice(4)
    return rest.length === 9
        ? `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`
        : `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`
}

export function maskName(value: string): string {
    const parts = (value ?? '').trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return ''
    if (parts.length === 1) return parts[0]
    return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
}

export function formatDateTimeBr(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date
    return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'medium',
        timeZone: 'America/Sao_Paulo',
    }).format(d)
}

function channel(value: number): number {
    const c = value / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function contrastWithWhite(hex: string): number {
    const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
    if (!match) return 0
    const [r, g, b] = match.slice(1).map((part) => channel(parseInt(part, 16)))
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return 1.05 / (luminance + 0.05)
}

export function isReadableBrandColor(hex: string): boolean {
    return contrastWithWhite(hex) >= 4.5
}
