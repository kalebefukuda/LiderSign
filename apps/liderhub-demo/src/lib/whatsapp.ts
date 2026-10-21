export function whatsappShareUrl(text: string, phone?: string) {
    const digits = (phone ?? '').replace(/\D/g, '')
    const target =
        digits.length >= 10 ? (digits.startsWith('55') && digits.length >= 12 ? digits : `55${digits}`) : ''
    return `https://wa.me/${target}?text=${encodeURIComponent(text)}`
}
