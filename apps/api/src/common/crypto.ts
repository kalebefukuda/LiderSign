import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

export function sha256Hex(data: Buffer | string): string {
    return createHash('sha256').update(data).digest('hex')
}

export function hmacSha256Hex(secret: string, data: string): string {
    return createHmac('sha256', secret).update(data).digest('hex')
}

export function safeEqual(a: string, b: string): boolean {
    const da = createHash('sha256').update(a).digest()
    const db = createHash('sha256').update(b).digest()
    return timingSafeEqual(da, db)
}

export function randomToken(bytes = 32): string {
    return randomBytes(bytes).toString('base64url')
}

export function randomHex(bytes = 32): string {
    return randomBytes(bytes).toString('hex')
}

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

export function verificationCode(): string {
    let code = ''
    for (let i = 0; i < 8; i++) code += CROCKFORD[randomInt(0, CROCKFORD.length)]
    return `${code.slice(0, 4)}-${code.slice(4)}`
}

export function normalizeVerificationCode(input: string): string | null {
    const clean = input
        .toUpperCase()
        .replace(/[^0-9A-Z]/g, '')
        .replace(/O/g, '0')
        .replace(/[IL]/g, '1')
    if (clean.length !== 8 || [...clean].some((char) => !CROCKFORD.includes(char))) return null
    return `${clean.slice(0, 4)}-${clean.slice(4)}`
}

export function otpCode(): string {
    return String(randomInt(0, 1_000_000)).padStart(6, '0')
}
