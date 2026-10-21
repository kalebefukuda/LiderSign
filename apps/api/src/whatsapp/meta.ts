import { createHmac } from 'node:crypto'
import { safeEqual } from '../common/crypto'
import { env } from '../config/env'

export type MetaInboundMessage = {
    from: string
    id: string
    type: string
    text?: { body?: string }
    interactive?: { type?: string; button_reply?: { id?: string; title?: string } }
    button?: { payload?: string; text?: string }
    image?: { id?: string; caption?: string; mime_type?: string }
}

export type MetaWebhookPayload = {
    object?: string
    entry?: { changes?: { value?: { messages?: MetaInboundMessage[] } }[] }[]
}

const MAX_MEDIA_BYTES = 5 * 1024 * 1024

/** Confere o X-Hub-Signature-256 da Meta (HMAC-SHA256 do corpo cru com o app secret). */
export function verifyMetaSignature(raw: Buffer | undefined, header: string | undefined): boolean {
    const secret = env().WHATSAPP_APP_SECRET
    if (!secret || !raw || !header?.startsWith('sha256=')) return false
    const expected = `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`
    return safeEqual(expected, header)
}

export function metaMessages(payload: MetaWebhookPayload): MetaInboundMessage[] {
    if (payload.object !== 'whatsapp_business_account') return []
    return (payload.entry ?? []).flatMap((entry) =>
        (entry.changes ?? []).flatMap((change) => change.value?.messages ?? []),
    )
}

/** Baixa a foto enviada pelo cliente (dois passos na Graph API: URL temporária e download). */
export async function downloadMetaMedia(mediaId: string): Promise<Buffer | null> {
    const { WHATSAPP_ACCESS_TOKEN, WHATSAPP_API_VERSION } = env()
    if (!WHATSAPP_ACCESS_TOKEN || !/^\d{5,40}$/.test(mediaId)) return null
    const headers = { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` }
    try {
        const info = await fetch(`https://graph.facebook.com/${WHATSAPP_API_VERSION}/${mediaId}`, {
            headers,
            signal: AbortSignal.timeout(10_000),
        })
        if (!info.ok) return null
        const { url, file_size } = (await info.json()) as { url?: string; file_size?: number }
        if (!url || (file_size ?? 0) > MAX_MEDIA_BYTES) return null
        const host = new URL(url).hostname
        if (
            !host.endsWith('.fbsbx.com') &&
            !host.endsWith('.facebook.com') &&
            !host.endsWith('.whatsapp.net')
        ) {
            return null
        }
        const file = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) })
        if (!file.ok) return null
        const data = Buffer.from(await file.arrayBuffer())
        return data.length <= MAX_MEDIA_BYTES ? data : null
    } catch {
        return null
    }
}
