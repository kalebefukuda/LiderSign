export const VARIABLE_PATTERN = /\{\{\s*([a-z][a-z0-9_]*)\s*\}\}/g

export type TemplateSpan = { text: string; bold: boolean }
export type TemplateBlock = { type: 'h1' | 'h2' | 'p' | 'li'; spans: TemplateSpan[] } | { type: 'hr' }

export function extractVariableKeys(body: string): string[] {
    const keys: string[] = []
    for (const match of body.matchAll(VARIABLE_PATTERN)) {
        if (!keys.includes(match[1])) keys.push(match[1])
    }
    return keys
}

export function fillTemplate(body: string, values: Record<string, string>): string {
    return body.replace(VARIABLE_PATTERN, (_, key: string) => {
        const value = values[key]
        return value !== undefined && value.trim() !== '' ? value.trim() : `[${key}]`
    })
}

export function missingVariables(body: string, values: Record<string, string>): string[] {
    return extractVariableKeys(body).filter((key) => !values[key] || values[key].trim() === '')
}

function parseSpans(line: string): TemplateSpan[] {
    const spans: TemplateSpan[] = []
    const parts = line.split(/(\*\*[^*]+\*\*)/g).filter((part) => part !== '')
    for (const part of parts) {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            spans.push({ text: part.slice(2, -2), bold: true })
        } else {
            spans.push({ text: part, bold: false })
        }
    }
    return spans
}

export function parseTemplate(body: string): TemplateBlock[] {
    const blocks: TemplateBlock[] = []
    let paragraph: string[] = []
    const flush = () => {
        if (paragraph.length) {
            blocks.push({ type: 'p', spans: parseSpans(paragraph.join(' ')) })
            paragraph = []
        }
    }
    for (const raw of body.replace(/\r\n/g, '\n').split('\n')) {
        const line = raw.trim()
        if (line === '') {
            flush()
        } else if (line === '---') {
            flush()
            blocks.push({ type: 'hr' })
        } else if (line.startsWith('## ')) {
            flush()
            blocks.push({ type: 'h2', spans: parseSpans(line.slice(3)) })
        } else if (line.startsWith('# ')) {
            flush()
            blocks.push({ type: 'h1', spans: parseSpans(line.slice(2)) })
        } else if (line.startsWith('- ')) {
            flush()
            blocks.push({ type: 'li', spans: parseSpans(line.slice(2)) })
        } else {
            paragraph.push(line)
        }
    }
    flush()
    return blocks
}

export function toPlainText(body: string): string {
    return parseTemplate(body)
        .map((block) => {
            if (block.type === 'hr') return ''
            const text = block.spans.map((span) => span.text).join('')
            return block.type === 'li' ? `• ${text}` : text
        })
        .filter((text) => text !== '')
        .join('\n\n')
}

export function humanizeKey(key: string): string {
    const text = key.replace(/_/g, ' ').trim()
    return text.charAt(0).toUpperCase() + text.slice(1)
}

export function slugifyKey(label: string): string {
    return label
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/^(\d)/, 'v_$1')
        .slice(0, 48)
}
