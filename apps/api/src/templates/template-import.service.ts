import {
    Injectable,
    Logger,
    UnprocessableEntityException,
    UnsupportedMediaTypeException,
} from '@nestjs/common'
import {
    TEMPLATE_KINDS,
    templateVariableSchema,
    type TemplateImportResponse,
    type TemplateKind,
    type TemplateVariable,
} from '@lidersign/shared'
import mammoth from 'mammoth'
import { z } from 'zod'
import { env } from '../config/env'
import { heuristicTemplate } from './heuristics'
import { syncVariables } from './templates.service'

type UploadedFile = { buffer: Buffer; originalname: string; mimetype: string; size: number }

type AiExtract = (input: { text: string; fileName?: string; apiKey: string; model: string }) => Promise<{
    suggestedName: string
    kind: TemplateKind
    body: string
    variables: TemplateVariable[]
    warnings?: string[]
}>

const aiResultSchema = z.object({
    suggestedName: z.string().min(1).max(200),
    kind: z.enum(TEMPLATE_KINDS),
    body: z.string().min(20).max(60_000),
    variables: z.array(templateVariableSchema).max(60),
    warnings: z.array(z.string()).optional(),
})

const AI_TIMEOUT_MS = 45_000

@Injectable()
export class TemplateImportService {
    private readonly logger = new Logger('Importação')

    /** Confere o tipo real pelo conteúdo (magic bytes), não pela extensão. */
    private detect(file: UploadedFile): 'pdf' | 'docx' | 'text' {
        const head = file.buffer.subarray(0, 4)
        if (head.toString('latin1') === '%PDF') return 'pdf'
        if (head.equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))) return 'docx'
        try {
            new TextDecoder('utf-8', { fatal: true }).decode(file.buffer)
            if (!file.buffer.includes(0)) return 'text'
        } catch {
            // não é texto
        }
        throw new UnsupportedMediaTypeException('Envie um PDF, DOCX, TXT ou MD')
    }

    private async extractText(file: UploadedFile): Promise<string> {
        const kind = this.detect(file)
        if (kind === 'text') return file.buffer.toString('utf8')
        if (kind === 'docx') {
            try {
                const result = await mammoth.extractRawText({ buffer: file.buffer })
                return result.value
            } catch {
                throw new UnsupportedMediaTypeException(
                    'Não foi possível ler o DOCX. Confira se o arquivo não está corrompido.',
                )
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { PDFParse } = require('pdf-parse') as typeof import('pdf-parse')
        const parser = new PDFParse({ data: new Uint8Array(file.buffer) })
        try {
            const result = await parser.getText()
            return result.text
        } catch {
            throw new UnsupportedMediaTypeException(
                'Não foi possível ler o PDF. Confira se o arquivo não está protegido.',
            )
        } finally {
            await parser.destroy().catch(() => undefined)
        }
    }

    private async tryAi(text: string, fileName: string): Promise<TemplateImportResponse | null> {
        const { ANTHROPIC_API_KEY, AI_MODEL } = env()
        if (!ANTHROPIC_API_KEY) return null
        try {
            const agent = (await import('@lidersign/agent')) as { extractTemplateWithAI?: AiExtract }
            if (typeof agent.extractTemplateWithAI !== 'function') return null
            const timeout = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('tempo esgotado')), AI_TIMEOUT_MS),
            )
            const raw = await Promise.race([
                agent.extractTemplateWithAI({ text, fileName, apiKey: ANTHROPIC_API_KEY, model: AI_MODEL }),
                timeout,
            ])
            const parsed = aiResultSchema.parse(raw)
            return {
                suggestedName: parsed.suggestedName.slice(0, 120),
                kind: parsed.kind,
                body: parsed.body,
                variables: syncVariables(parsed.body, parsed.variables),
                engine: 'ai',
                warnings: parsed.warnings?.length
                    ? parsed.warnings
                    : ['Revise os campos sugeridos pela IA antes de salvar.'],
            }
        } catch (error) {
            this.logger.warn(`IA indisponível, usando regras locais: ${(error as Error).message}`)
            return null
        }
    }

    async import(file: UploadedFile | undefined): Promise<TemplateImportResponse> {
        if (!file?.buffer?.length) throw new UnprocessableEntityException('Envie o arquivo no campo "file"')
        const text = (await this.extractText(file)).trim()
        if (text.replace(/\s/g, '').length < 20) {
            throw new UnprocessableEntityException(
                'Não encontramos texto no arquivo. Se for um PDF escaneado, envie a versão em Word ou texto.',
            )
        }
        const limited = text.slice(0, 60_000)
        const ai = await this.tryAi(limited, file.originalname)
        if (ai) return ai
        const heuristic = heuristicTemplate(limited)
        const warnings = [...heuristic.warnings]
        if (env().ANTHROPIC_API_KEY) warnings.unshift('A IA não respondeu a tempo; usamos as regras locais.')
        return {
            suggestedName: heuristic.suggestedName,
            kind: heuristic.kind,
            body: heuristic.body,
            variables: heuristic.variables,
            engine: 'heuristic',
            warnings,
        }
    }
}
