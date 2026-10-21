import { Injectable, Logger } from '@nestjs/common'
import { env } from '../config/env'

export type AiTextBlock = { type: 'text'; text: string }
export type AiToolUseBlock = { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
export type AiToolResultBlock = { type: 'tool_result'; tool_use_id: string; content: string }
export type AiContent = AiTextBlock | AiToolUseBlock | AiToolResultBlock

export type AiMessage = { role: 'user' | 'assistant'; content: string | AiContent[] }

export type AiTool = {
    name: string
    description: string
    input_schema: { type: 'object'; properties: Record<string, unknown>; required?: string[] }
}

export type AiResponse = {
    content: (AiTextBlock | AiToolUseBlock)[]
    stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence' | string
}

const ENDPOINT = 'https://api.anthropic.com/v1/messages'

/**
 * Chamada direta à API de mensagens do Claude. Sem chave configurada, ou se a chamada falhar,
 * devolve null e quem chamou usa o roteiro reserva. Nunca registra o conteúdo enviado.
 */
@Injectable()
export class AiService {
    private readonly logger = new Logger('IA')

    get enabled() {
        return Boolean(env().ANTHROPIC_API_KEY)
    }

    async message(
        input: { system: string; messages: AiMessage[]; tools?: AiTool[]; maxTokens?: number },
        timeoutMs = 20_000,
    ): Promise<AiResponse | null> {
        const key = env().ANTHROPIC_API_KEY
        if (!key) return null
        try {
            const res = await fetch(ENDPOINT, {
                method: 'POST',
                headers: {
                    'x-api-key': key,
                    'anthropic-version': '2023-06-01',
                    'content-type': 'application/json',
                },
                body: JSON.stringify({
                    model: env().AI_MODEL,
                    max_tokens: input.maxTokens ?? 700,
                    system: input.system,
                    messages: input.messages,
                    ...(input.tools?.length ? { tools: input.tools } : {}),
                }),
                signal: AbortSignal.timeout(timeoutMs),
            })
            if (!res.ok) {
                this.logger.warn(`A IA respondeu HTTP ${res.status}; usando o roteiro reserva`)
                return null
            }
            return (await res.json()) as AiResponse
        } catch (error) {
            this.logger.warn(`Falha ao chamar a IA (${(error as Error).name}); usando o roteiro reserva`)
            return null
        }
    }

    async text(system: string, prompt: string, maxTokens = 500): Promise<string | null> {
        const response = await this.message({
            system,
            messages: [{ role: 'user', content: prompt }],
            maxTokens,
        })
        if (!response) return null
        const text = response.content
            .filter((block): block is AiTextBlock => block.type === 'text')
            .map((block) => block.text)
            .join('\n')
            .trim()
        return text || null
    }
}
