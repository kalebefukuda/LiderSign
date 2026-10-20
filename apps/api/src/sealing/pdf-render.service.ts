import { Injectable } from '@nestjs/common'
import { parseTemplate, type TemplateBlock, type TemplateSpan } from '@lidersign/shared'
import PdfPrinter from 'pdfmake'
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'

// Fontes Roboto embutidas no próprio pdfmake (sem download em build).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const vfs = require('pdfmake/build/vfs_fonts') as Record<string, string>

const font = (name: string) => Buffer.from(vfs[name], 'base64')

const printer = new PdfPrinter({
    Roboto: {
        normal: font('Roboto-Regular.ttf'),
        bold: font('Roboto-Medium.ttf'),
        italics: font('Roboto-Italic.ttf'),
        bolditalics: font('Roboto-MediumItalic.ttf'),
    },
})

export const INK = '#1F2937'
export const MUTED = '#6B7280'
export const RULE = '#E5E7EB'
export const ACCENT = '#2463EB'
/** Largura útil de uma página A4 com margens de 56 pt. */
export const CONTENT_WIDTH = 595.28 - 56 * 2

function spansToText(spans: TemplateSpan[]) {
    return spans.map((span) => ({ text: span.text, bold: span.bold }))
}

/** Converte o Markdown enxuto do modelo em conteúdo do pdfmake. */
export function blocksToContent(blocks: TemplateBlock[]): Content[] {
    const content: Content[] = []
    let list: Content[] = []
    const flushList = () => {
        if (list.length) {
            content.push({ ul: list, style: 'list' })
            list = []
        }
    }
    for (const block of blocks) {
        if (block.type === 'li') {
            list.push({ text: spansToText(block.spans), style: 'p', margin: [0, 0, 0, 3] })
            continue
        }
        flushList()
        if (block.type === 'hr') {
            content.push({
                canvas: [{ type: 'line', x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0, lineWidth: 0.5, lineColor: RULE }],
                margin: [0, 6, 0, 10],
            })
        } else {
            content.push({ text: spansToText(block.spans), style: block.type })
        }
    }
    flushList()
    return content
}

export function renderPdf(definition: TDocumentDefinitions): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = printer.createPdfKitDocument(definition)
        const chunks: Buffer[] = []
        doc.on('data', (chunk: Buffer) => chunks.push(chunk))
        doc.on('end', () => resolve(Buffer.concat(chunks)))
        doc.on('error', reject)
        doc.end()
    })
}

export const baseStyles: TDocumentDefinitions['styles'] = {
    h1: { fontSize: 16, bold: true, color: '#111827', margin: [0, 0, 0, 14], lineHeight: 1.2 },
    h2: { fontSize: 12, bold: true, color: '#111827', margin: [0, 12, 0, 6] },
    p: { fontSize: 10.5, lineHeight: 1.35, alignment: 'justify', margin: [0, 0, 0, 8] },
    list: { margin: [0, 0, 0, 8] },
    small: { fontSize: 8, color: MUTED },
    header: { fontSize: 8, color: MUTED },
}

@Injectable()
export class PdfRenderService {
    /** PDF original: é o que o signatário lê e o que tem o hash registrado. */
    renderDocument(input: { title: string; officeName: string; body: string }): Promise<Buffer> {
        const definition: TDocumentDefinitions = {
            pageSize: 'A4',
            pageMargins: [56, 72, 56, 72],
            info: {
                title: input.title,
                author: input.officeName,
                creator: 'LíderSign',
                producer: 'LíderSign',
            },
            header: () => ({
                columns: [
                    { text: input.officeName, style: 'header' },
                    { text: input.title, style: 'header', alignment: 'right' },
                ],
                margin: [56, 32, 56, 0],
            }),
            footer: (currentPage: number, pageCount: number) => ({
                text: `Página ${currentPage} de ${pageCount}`,
                style: 'header',
                alignment: 'right',
                margin: [56, 20, 56, 0],
            }),
            content: blocksToContent(parseTemplate(input.body)),
            defaultStyle: { font: 'Roboto', fontSize: 10.5, color: INK },
            styles: baseStyles,
        }
        return renderPdf(definition)
    }
}
