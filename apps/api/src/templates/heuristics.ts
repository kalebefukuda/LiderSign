import {
    humanizeKey,
    slugifyKey,
    type TemplateKind,
    type TemplateVariable,
    type VariableType,
} from '@lidersign/shared'

export type HeuristicResult = {
    suggestedName: string
    kind: TemplateKind
    body: string
    variables: TemplateVariable[]
    warnings: string[]
}

const UPPER = /[A-ZÁÉÍÓÚÂÊÔÃÕÇÀÜ]/g
const LETTERS = /[A-Za-zÁÉÍÓÚÂÊÔÃÕÇÀÜáéíóúâêôãõçàü]/g

function isHeading(line: string): boolean {
    if (line.length > 90 || line.length < 3) return false
    if (/^(CL[ÁA]USULA|Cl[áa]usula|CAP[ÍI]TULO|Cap[íi]tulo|SE[ÇC][ÃA]O)\b/.test(line)) return true
    const letters = line.match(LETTERS)?.length ?? 0
    const upper = line.match(UPPER)?.length ?? 0
    if (letters >= 3 && upper / letters > 0.85 && !/[.;,]$/.test(line)) return true
    return /^\d+(\.\d+)*[.)]?\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][^.]{2,60}$/.test(line) && !/[.;]$/.test(line)
}

function sentenceCase(text: string): string {
    const letters = text.match(LETTERS)?.length ?? 0
    const upper = text.match(UPPER)?.length ?? 0
    if (letters === 0 || upper / letters < 0.85) return text
    const lower = text.toLocaleLowerCase('pt-BR')
    return lower.charAt(0).toLocaleUpperCase('pt-BR') + lower.slice(1)
}

function detectKind(text: string): TemplateKind {
    const head = text.slice(0, 400).toLowerCase()
    if (/procura[çc][ãa]o/.test(head)) return 'PROCURACAO'
    if (/declara[çc][ãa]o/.test(head)) return 'DECLARACAO'
    if (/contrato/.test(head)) return 'CONTRATO'
    return 'OUTRO'
}

function toMarkdown(text: string): { title: string; lines: string[] } {
    const raw = text
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter((line) => !/^-+\s*\d+\s+(of|de)\s+\d+\s*-+$/i.test(line))

    const out: string[] = []
    let paragraph: string[] = []
    let title = ''
    const flush = () => {
        if (paragraph.length) {
            out.push(paragraph.join(' '), '')
            paragraph = []
        }
    }
    for (const line of raw) {
        if (line === '') {
            flush()
            continue
        }
        if (!title) {
            title = line.replace(/^#+\s*/, '')
            out.push(`# ${sentenceCase(title)}`, '')
            continue
        }
        if (/^[-•*]\s+/.test(line) || /^[a-z]\)\s+/.test(line)) {
            flush()
            out.push(`- ${line.replace(/^([-•*]|[a-z]\))\s+/, '')}`)
            continue
        }
        if (isHeading(line)) {
            flush()
            out.push('', `## ${sentenceCase(line)}`, '')
            continue
        }
        paragraph.push(line)
    }
    flush()
    return { title: sentenceCase(title), lines: out }
}

type Rule = { pattern: RegExp; prefix: string; type: VariableType; label: string; example: string }

const VALUE_RULES: Rule[] = [
    {
        pattern: /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g,
        prefix: 'cnpj',
        type: 'cnpj',
        label: 'CNPJ',
        example: '00.000.000/0001-00',
    },
    {
        pattern: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g,
        prefix: 'cpf',
        type: 'cpf',
        label: 'CPF',
        example: '000.000.000-00',
    },
    {
        pattern: /\b\d{2}\/\d{2}\/\d{4}\b/g,
        prefix: 'data',
        type: 'date',
        label: 'Data',
        example: '20/10/2026',
    },
    {
        pattern: /R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})?/g,
        prefix: 'valor',
        type: 'money',
        label: 'Valor',
        example: 'R$ 1.500,00',
    },
    {
        pattern: /\(\d{2}\)\s?\d{4,5}-\d{4}/g,
        prefix: 'telefone',
        type: 'phone',
        label: 'Telefone',
        example: '(47) 99999-0000',
    },
]

export function heuristicTemplate(text: string): HeuristicResult {
    const { title, lines } = toMarkdown(text)
    const [titleLine, ...rest] = lines
    let body = rest
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()

    const variables: TemplateVariable[] = []
    const add = (key: string, label: string, type: VariableType, example?: string) => {
        if (!variables.some((variable) => variable.key === key)) {
            variables.push({ key, label, type, ...(example ? { example } : {}) })
        }
        return `{{${key}}}`
    }
    const counters = new Map<string, number>()
    const next = (prefix: string) => {
        const n = (counters.get(prefix) ?? 0) + 1
        counters.set(prefix, n)
        return `${prefix}_${n}`
    }
    const fromLabel = (label: string) => {
        const key = slugifyKey(label) || next('campo')
        const nice = label.trim().toLocaleLowerCase('pt-BR')
        return add(key, nice.charAt(0).toLocaleUpperCase('pt-BR') + nice.slice(1), 'text')
    }

    body = body.replace(/\{\{\s*([^{}\n]{1,60})\s*\}\}/g, (_, name: string) => {
        const key = slugifyKey(name) || next('campo')
        return add(key, humanizeKey(key), 'text')
    })
    body = body.replace(/\[([^[\]\n]{2,60})\]/g, (_, label: string) => fromLabel(label))
    body = body.replace(/(?:<<|«)\s*([^<>«»\n]{2,60}?)\s*(?:>>|»)/g, (_, label: string) => fromLabel(label))
    body = body.replace(/(?<!\{)\{\s*([A-Za-zÀ-ú_][^{}\n]{0,50}?)\s*\}(?!\})/g, (_, label: string) =>
        fromLabel(label),
    )
    let signatureLines = 0
    body = body.replace(
        /^[^\n]{0,40}(assinatura|assinado|outorgante|contratante|contratado)[^\n]{0,20}:?\s*_{5,}\s*$/gim,
        () => {
            signatureLines++
            return ''
        },
    )
    body = body.replace(/^\s*_{5,}\s*$/gm, () => {
        signatureLines++
        return ''
    })
    body = body.replace(/(?:assinatura|assinado por)\s*:?\s*_{5,}/gi, () => {
        signatureLines++
        return ''
    })
    body = body.replace(/\n{3,}/g, '\n\n').trim()
    body = body.replace(/_{5,}/g, () => {
        const key = next('campo')
        return add(key, humanizeKey(key), 'text')
    })

    for (const rule of VALUE_RULES) {
        const seen = new Map<string, string>()
        body = body.replace(rule.pattern, (value: string) => {
            let key = seen.get(value)
            if (!key) {
                key = next(rule.prefix)
                seen.set(value, key)
                const n = key.split('_').pop()
                add(key, `${rule.label} ${n}`, rule.type, rule.example)
            }
            return `{{${key}}}`
        })
    }

    const warnings = ['Revise os campos sugeridos antes de salvar.']
    if (signatureLines > 0) {
        warnings.push(
            'Removemos as linhas de assinatura: o LíderSign adiciona a assinatura e a página de evidências.',
        )
    }
    if (variables.length === 0) {
        warnings.push(
            'Nenhum campo variável encontrado: marque os trechos que mudam a cada cliente com {{nome_do_campo}}.',
        )
    }
    return {
        suggestedName: (title || 'Modelo importado').slice(0, 120),
        kind: detectKind(`${title}\n${body}`),
        body: `${titleLine}\n\n${body}`.trim(),
        variables,
        warnings,
    }
}
