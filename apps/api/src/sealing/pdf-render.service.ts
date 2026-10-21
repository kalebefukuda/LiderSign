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
                canvas: [
                    { type: 'line', x1: 0, y1: 0, x2: CONTENT_WIDTH, y2: 0, lineWidth: 0.5, lineColor: RULE },
                ],
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

/** Quem assina, como aparece no bloco de assinatura do fim do documento. */
export type DocumentSigner = { name: string; cpfMasked: string; role: string }

export type DocumentInput = { title: string; officeName: string; body: string; signer: DocumentSigner }

/** Marca no PDF original: ele tem o bloco de assinatura (documentos antigos não têm). */
export const SIGNATURE_BLOCK_KEYWORD = 'lidersign:signature-block:v1'

/** Espaço reservado para a assinatura, em pontos. */
export const SIGNATURE_AREA = { width: 240, height: 56 }
/** Altura total do bloco (rótulo + área + linha + nome + papel + nota): se não couber, vai inteiro para a próxima página. */
const SIGNATURE_BLOCK_HEIGHT = 128

const SIGNATURE_BLOCK_ID = 'lidersign-signature-block'
const SIGNATURE_AREA_ID = 'lidersign-signature-area'

export type SignatureAnchor = { pageNumber: number; left: number; top: number }

export function roleForKind(kind: string): string {
    if (kind === 'PROCURACAO') return 'Outorgante'
    if (kind === 'CONTRATO') return 'Contratante'
    return 'Signatário'
}

function signatureBlock(signer: DocumentSigner): Content {
    // O pdfmake aceita "id" em qualquer nó (e o repassa ao pageBreakBefore), mas os tipos só o declaram em texto
    const block = {
        id: SIGNATURE_BLOCK_ID,
        margin: [0, 32, 0, 0],
        stack: [
            { text: 'ASSINATURA', fontSize: 7.5, color: MUTED, characterSpacing: 1.2, margin: [0, 0, 0, 6] },
            {
                id: SIGNATURE_AREA_ID,
                stack: [
                    {
                        canvas: [
                            {
                                type: 'rect',
                                x: 0,
                                y: 0,
                                w: SIGNATURE_AREA.width,
                                h: SIGNATURE_AREA.height,
                                color: '#FFFFFF',
                            },
                        ],
                    },
                ],
            },
            {
                canvas: [
                    {
                        type: 'line',
                        x1: 0,
                        y1: 0,
                        x2: SIGNATURE_AREA.width,
                        y2: 0,
                        lineWidth: 0.6,
                        lineColor: MUTED,
                    },
                ],
            },
            { text: signer.name, fontSize: 10, bold: true, color: '#111827', margin: [0, 5, 0, 0] },
            {
                text: `${signer.role} · CPF ${signer.cpfMasked}`,
                fontSize: 8.5,
                color: MUTED,
                margin: [0, 2, 0, 0],
            },
            {
                text: 'Assinatura eletrônica pelo LíderSign',
                fontSize: 7.5,
                color: MUTED,
                margin: [0, 2, 0, 0],
            },
        ],
    }
    return block as unknown as Content
}

/**
 * Definição do PDF original. O bloco de assinatura nunca se divide entre páginas, e a posição da área
 * reservada é informada em onAnchor: a selagem desenha a assinatura exatamente ali.
 */
function documentDefinition(
    input: DocumentInput,
    onAnchor?: (anchor: SignatureAnchor) => void,
): TDocumentDefinitions {
    return {
        pageSize: 'A4',
        pageMargins: [56, 72, 56, 72],
        info: {
            title: input.title,
            author: input.officeName,
            creator: 'LíderSign',
            producer: 'LíderSign',
            keywords: SIGNATURE_BLOCK_KEYWORD,
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
        content: [...blocksToContent(parseTemplate(input.body)), signatureBlock(input.signer)],
        pageBreakBefore: (node) => {
            const position = node.startPosition
            if (node.id === SIGNATURE_BLOCK_ID) {
                return position.top + SIGNATURE_BLOCK_HEIGHT > 72 + position.pageInnerHeight
            }
            if (node.id === SIGNATURE_AREA_ID) {
                onAnchor?.({ pageNumber: position.pageNumber, left: position.left, top: position.top })
            }
            return false
        },
        defaultStyle: { font: 'Roboto', fontSize: 10.5, color: INK },
        styles: baseStyles,
    }
}

/** Refaz o layout do original (determinístico) só para achar onde fica a área de assinatura. */
export async function locateSignatureArea(input: DocumentInput): Promise<SignatureAnchor | null> {
    let anchor: SignatureAnchor | null = null
    await renderPdf(documentDefinition(input, (found) => (anchor = found)))
    return anchor
}

@Injectable()
export class PdfRenderService {
    /** PDF original: é o que o signatário lê e o que tem o hash registrado. */
    renderDocument(input: DocumentInput): Promise<Buffer> {
        return renderPdf(documentDefinition(input))
    }
}
