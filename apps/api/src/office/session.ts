import { createHmac } from 'node:crypto'
import type { Request, Response } from 'express'
import { randomToken, safeEqual, sha256Hex } from '../common/crypto'
import { env } from '../config/env'

export const SESSION_COOKIE = 'ls_session'
export const CLIENT_HEADER = 'x-lidersign-client'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000
const LOGIN_TTL_MS = 2 * 60 * 1000
const MAX_PENDING = 1000

const pending = new Map<string, { tenantId: string; expiresAt: number }>()

function secret() {
    return (
        env().SESSION_SECRET ??
        createHmac('sha256', env().PARTNER_API_KEY).update('lidersign:office-session').digest('hex')
    )
}

function sign(payload: string) {
    return createHmac('sha256', secret()).update(payload).digest('base64url')
}

function prune(now: number) {
    for (const [key, item] of pending) if (item.expiresAt <= now) pending.delete(key)
    while (pending.size >= MAX_PENDING) {
        const oldest = pending.keys().next().value
        if (oldest === undefined) break
        pending.delete(oldest)
    }
}

export function issueLoginToken(tenantId: string) {
    const now = Date.now()
    prune(now)
    const token = randomToken(24)
    const expiresAt = now + LOGIN_TTL_MS
    pending.set(sha256Hex(token), { tenantId, expiresAt })
    return { token, expiresAt: new Date(expiresAt) }
}

export function redeemLoginToken(token: string): string | null {
    const key = sha256Hex(token)
    const item = pending.get(key)
    pending.delete(key)
    if (!item || item.expiresAt <= Date.now()) return null
    return item.tenantId
}

function readCookie(header: string | undefined, name: string): string | null {
    if (!header) return null
    for (const part of header.split(';')) {
        const index = part.indexOf('=')
        if (index < 0) continue
        if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim()
    }
    return null
}

export function readSession(req: Request): string | null {
    const raw = readCookie(req.headers.cookie, SESSION_COOKIE)
    if (!raw) return null
    const [payload, mac] = raw.split('.')
    if (!payload || !mac || !safeEqual(mac, sign(payload))) return null
    try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
            t?: unknown
            e?: unknown
        }
        if (typeof data.t !== 'string' || typeof data.e !== 'number' || data.e <= Date.now()) return null
        return data.t
    } catch {
        return null
    }
}

function cookieOptions(req: Request) {
    return { httpOnly: true, sameSite: 'lax' as const, secure: req.secure, path: '/' }
}

export function setSessionCookie(req: Request, res: Response, tenantId: string) {
    const payload = Buffer.from(JSON.stringify({ t: tenantId, e: Date.now() + SESSION_TTL_MS })).toString(
        'base64url',
    )
    res.cookie(SESSION_COOKIE, `${payload}.${sign(payload)}`, {
        ...cookieOptions(req),
        maxAge: SESSION_TTL_MS,
    })
}

export function clearSessionCookie(req: Request, res: Response) {
    res.clearCookie(SESSION_COOKIE, cookieOptions(req))
}
