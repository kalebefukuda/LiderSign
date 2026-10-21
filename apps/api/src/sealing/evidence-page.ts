import { formatDateTimeBr } from '@lidersign/shared'
import type { Column, Content, ContentTable, TableLayout, TDocumentDefinitions } from 'pdfmake/interfaces'
import { ACCENT, baseStyles, INK, MUTED, RULE } from './pdf-render.service'

export type EvidenceInput = {
    title: string
    officeName: string
    verificationCode: string
    verificationUrl: string
    qrDataUrl: string
    signer: { name: string; cpfMasked: string; phoneLine: string }
    signature: { type: 'drawn'; imageDataUrl: string } | { type: 'typed'; typedName: string }
    selfieDataUrl: string | null
    selfieNote: string | null
    assuranceLabel: string
    signedAt: Date
    channelRows: [string, string][]
    geolocation: string | null
    identity: string
    consentText: string
    originalSha256: string
    timestamp: string
    trail: { at: Date; label: string; hash: string }[]
}

export function groupHex(hex: string, size = 8): string {
    return (hex.match(new RegExp(`.{1,${size}}`, 'g')) ?? []).join(' ')
}

export function summarizeUserAgent(ua: string | null): string {
    if (!ua) return 'Não informado'
    const os = /iPhone|iPad/.test(ua)
        ? 'iPhone/iPad'
        : /Android/.test(ua)
          ? 'Android'
          : /Windows/.test(ua)
            ? 'Windows'
            : /Mac OS X|Macintosh/.test(ua)
              ? 'macOS'
              : /Linux/.test(ua)
                ? 'Linux'
                : 'sistema não identificado'
    const browser = /SamsungBrowser/.test(ua)
        ? 'Samsung Internet'
        : /Edg\//.test(ua)
          ? 'Edge'
          : /Firefox\//.test(ua)
            ? 'Firefox'
            : /Chrome\/|CriOS/.test(ua)
              ? 'Chrome'
              : /Safari\//.test(ua)
                ? 'Safari'
                : /curl\//.test(ua)
                  ? 'curl'
                  : 'navegador não identificado'
    return `${browser} no ${os}`
}

const rowsLayout: TableLayout = {
    hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? 0 : 0.5),
    vLineWidth: () => 0,
    hLineColor: () => RULE,
    paddingLeft: () => 0,
    paddingRight: () => 8,
    paddingTop: () => 4,
    paddingBottom: () => 4,
}

const trailLayout: TableLayout = { ...rowsLayout, paddingTop: () => 2.5, paddingBottom: () => 2.5 }

function section(title: string): Content {
    return {
        stack: [
            { text: title.toUpperCase(), fontSize: 8, bold: true, color: MUTED, characterSpacing: 1.2 },
            {
                canvas: [{ type: 'line', x1: 0, y1: 0, x2: 483, y2: 0, lineWidth: 0.75, lineColor: INK }],
                margin: [0, 4, 0, 2],
            },
        ],
        margin: [0, 14, 0, 0],
    }
}

function keyValueTable(rows: [string, string][]): ContentTable {
    return {
        table: {
            widths: [140, '*'],
            body: rows.map(([label, value]) => [
                { text: label, fontSize: 8.5, color: MUTED },
                { text: value, fontSize: 9, color: INK },
            ]),
        },
        layout: rowsLayout,
    }
}

export function buildEvidenceDefinition(input: EvidenceInput): TDocumentDefinitions {
    const signatureVisual: Content =
        input.signature.type === 'drawn'
            ? { image: input.signature.imageDataUrl, fit: [190, 64] }
            : {
                  text: input.signature.typedName,
                  italics: true,
                  fontSize: Math.max(
                      12,
                      Math.min(20, Math.floor(370 / Math.max(input.signature.typedName.length, 1))),
                  ),
                  color: '#0B1F4D',
                  margin: [0, 14, 0, 14],
              }

    const signerColumns: Column[] = [
        {
            width: '*',
            stack: [
                { text: input.signer.name, fontSize: 12, bold: true, color: '#111827' },
                { text: `CPF ${input.signer.cpfMasked}`, fontSize: 9, color: INK, margin: [0, 4, 0, 0] },
                {
                    text: input.signer.phoneLine,
                    fontSize: 9,
                    color: INK,
                    margin: [0, 2, 0, 0],
                },
            ],
        },
        {
            width: 200,
            stack: [
                signatureVisual,
                {
                    canvas: [
                        { type: 'line', x1: 0, y1: 0, x2: 190, y2: 0, lineWidth: 0.5, lineColor: MUTED },
                    ],
                    margin: [0, 2, 0, 3],
                },
                {
                    text:
                        input.signature.type === 'drawn'
                            ? 'Assinatura desenhada'
                            : 'Nome digitado como assinatura',
                    fontSize: 7.5,
                    color: MUTED,
                },
            ],
        },
    ]
    if (input.selfieDataUrl || input.selfieNote) {
        signerColumns.push({
            width: 70,
            stack: input.selfieDataUrl
                ? [
                      { image: input.selfieDataUrl, fit: [64, 64] },
                      { text: 'Selfie', fontSize: 7.5, color: MUTED, margin: [0, 3, 0, 0] },
                  ]
                : [{ text: input.selfieNote ?? '', fontSize: 7.5, color: MUTED }],
        })
    }

    const trailTable: ContentTable = {
        table: {
            headerRows: 1,
            widths: [104, '*', 64],
            body: [
                [
                    { text: 'Data e hora (Brasília)', fontSize: 7.5, color: MUTED, bold: true },
                    { text: 'Evento', fontSize: 7.5, color: MUTED, bold: true },
                    { text: 'Hash', fontSize: 7.5, color: MUTED, bold: true },
                ],
                ...input.trail.map((item) => [
                    { text: formatDateTimeBr(item.at), fontSize: 8, color: INK },
                    { text: item.label, fontSize: 8, color: INK },
                    { text: item.hash.slice(0, 8), fontSize: 8, color: MUTED },
                ]),
            ],
        },
        layout: trailLayout,
    }

    return {
        pageSize: 'A4',
        pageMargins: [56, 44, 56, 56],
        info: { title: `Evidências · ${input.title}`, creator: 'LíderHub', producer: 'LíderHub' },
        content: [
            {
                columns: [
                    {
                        width: '*',
                        stack: [
                            {
                                text: 'LÍDERHUB · CONTRATOS',
                                fontSize: 8,
                                bold: true,
                                color: ACCENT,
                                characterSpacing: 2,
                            },
                            { text: 'Página de evidências', style: 'h1', margin: [0, 6, 0, 6] },
                            { text: input.title, fontSize: 11, bold: true, color: '#111827' },
                            { text: input.officeName, fontSize: 9, color: MUTED, margin: [0, 2, 0, 10] },
                            { text: 'Verifique a autenticidade em', fontSize: 8, color: MUTED },
                            {
                                text: input.verificationUrl,
                                link: input.verificationUrl,
                                fontSize: 9,
                                color: ACCENT,
                                margin: [0, 2, 0, 0],
                            },
                        ],
                    },
                    {
                        width: 104,
                        stack: [
                            { image: input.qrDataUrl, width: 96, alignment: 'center' },
                            {
                                text: input.verificationCode,
                                fontSize: 11,
                                bold: true,
                                alignment: 'center',
                                characterSpacing: 1,
                                margin: [0, 2, 0, 0],
                            },
                            { text: 'código de verificação', fontSize: 7, color: MUTED, alignment: 'center' },
                        ],
                    },
                ],
                columnGap: 16,
            },
            section('Signatário'),
            { columns: signerColumns, columnGap: 16, margin: [0, 8, 0, 0] },
            section('Evidências da assinatura'),
            keyValueTable([
                ['Nível de garantia', input.assuranceLabel],
                ['Identificação', input.identity],
                ['Assinado em', `${formatDateTimeBr(input.signedAt)} (horário de Brasília)`],
                ...input.channelRows,
                ...(input.geolocation ? ([['Geolocalização', input.geolocation]] as [string, string][]) : []),
                ['Aceite', input.consentText],
            ]),
            section('Integridade e carimbo do tempo'),
            keyValueTable([
                ['SHA-256 do documento original', groupHex(input.originalSha256)],
                ['Carimbo do tempo (RFC 3161)', input.timestamp],
            ]),
            section('Trilha de auditoria'),
            trailTable,
            {
                text: 'Documento assinado eletronicamente, com autoria e integridade comprováveis pelas evidências acima (MP 2.200-2/2001, art. 10, § 2º). A integridade deste PDF é protegida por selo digital e pode ser conferida pelo código acima.',
                fontSize: 8,
                color: MUTED,
                margin: [0, 12, 0, 0],
            },
        ],
        defaultStyle: { font: 'Roboto', fontSize: 9, color: INK },
        styles: baseStyles,
    }
}
