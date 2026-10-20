/** Textos curtos, em linguagem simples: o público é leigo e lê no celular. */

export function firstName(fullName: string): string {
    return fullName.trim().split(/\s+/)[0] ?? ''
}

export function signingLinkText(signerName: string, officeName: string, title: string, url: string): string {
    return `Olá, ${firstName(signerName)}! ${officeName} enviou "${title}" para você assinar pelo celular: ${url}`
}

export function otpText(code: string): string {
    return `Seu código LíderSign é ${code}. Vale por 10 minutos. Não compartilhe com ninguém.`
}

export function signedCopyText(signerName: string, title: string, url: string, verifyUrl: string): string {
    return `Pronto, ${firstName(signerName)}! "${title}" foi assinado. Sua cópia: ${url} · Verificação: ${verifyUrl}`
}
