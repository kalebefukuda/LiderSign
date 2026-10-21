import { join } from 'node:path'

export const MAX_LOGO_BYTES = 300 * 1024

export function logoKey(tenantId: string) {
    return join(tenantId, 'brand', 'logo')
}

export function logoMime(data: Buffer): 'image/png' | 'image/jpeg' | null {
    if (
        data.length >= 8 &&
        data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    ) {
        return 'image/png'
    }
    if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg'
    return null
}
