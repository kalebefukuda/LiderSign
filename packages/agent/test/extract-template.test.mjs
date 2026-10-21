import assert from 'node:assert/strict'
import { test } from 'node:test'
import { extractTemplateWithAI, normalizeExtraction } from '../dist/index.js'

const RAW = {
    suggestedName: 'Contrato de honorários BPC/LOAS',
    kind: 'CONTRATO',
    body: [
        '# CONTRATO DE HONORÁRIOS ADVOCATÍCIOS',
        '',
        'Pelo presente instrumento, {{nome_cliente}}, CPF {{cpf_cliente}}, contrata {{Nome do Advogado}}.',
        '',
        '## CLÁUSULA PRIMEIRA',
        '',
        'Os honorários serão de {{percentual_honorarios}} do proveito econômico.',
    ].join('\n'),
    variables: [
        { key: 'nome_cliente', label: 'Nome do cliente', type: 'text', example: 'Maria Exemplo' },
        { key: 'cpf_cliente', label: 'CPF do cliente', type: 'cpf', example: '' },
        { key: 'nome_cliente', label: 'Duplicada', type: 'text', example: '' },
        { key: 'sobrando', label: 'Não usada', type: 'text', example: '' },
    ],
    warnings: ['Revise a cláusula de êxito.'],
}

test('normalizeExtraction corrige chaves, declara as que faltam e remove as que sobram', () => {
    const out = normalizeExtraction(RAW, 'contrato.pdf')
    assert.equal(out.kind, 'CONTRATO')
    assert.match(out.body, /\{\{nome_do_advogado\}\}/)
    const keys = out.variables.map((v) => v.key)
    assert.deepEqual(keys, ['nome_cliente', 'cpf_cliente', 'nome_do_advogado', 'percentual_honorarios'])
    assert.equal(out.variables.find((v) => v.key === 'cpf_cliente').example, undefined)
    assert.ok(out.warnings.some((w) => w.includes('sobrando')))
    assert.ok(out.warnings.some((w) => w.includes('percentual_honorarios')))
})

test('normalizeExtraction recusa corpo curto demais', () => {
    assert.throws(() => normalizeExtraction({ ...RAW, body: 'curto' }), /validação/)
})

/** Modelo falso no contrato LanguageModelV2 do AI SDK: devolve o JSON pronto, sem rede. */
function mockModel(json) {
    const text = JSON.stringify(json)
    const usage = { inputTokens: 10, outputTokens: 10, totalTokens: 20 }
    return {
        specificationVersion: 'v2',
        provider: 'mock',
        modelId: 'mock-model',
        supportedUrls: {},
        async doGenerate() {
            return { content: [{ type: 'text', text }], finishReason: 'stop', usage, warnings: [] }
        },
        async doStream() {
            return {
                stream: new ReadableStream({
                    start(controller) {
                        controller.enqueue({ type: 'stream-start', warnings: [] })
                        controller.enqueue({ type: 'text-start', id: 't1' })
                        controller.enqueue({ type: 'text-delta', id: 't1', delta: text })
                        controller.enqueue({ type: 'text-end', id: 't1' })
                        controller.enqueue({ type: 'finish', finishReason: 'stop', usage })
                        controller.close()
                    },
                }),
            }
        },
    }
}

test('extractTemplateWithAI usa o agente Mastra e devolve o modelo validado', async () => {
    const text = 'CONTRATO DE HONORÁRIOS. Maria Exemplo, CPF 529.982.247-25, contrata o advogado. '.repeat(3)
    const out = await extractTemplateWithAI({
        text,
        fileName: 'contrato-maria.pdf',
        apiKey: '',
        modelOverride: mockModel(RAW),
    })
    assert.equal(out.suggestedName, 'Contrato de honorários BPC/LOAS')
    assert.equal(out.variables.length, 4)
    assert.ok(out.body.startsWith('# CONTRATO'))
})

test('extractTemplateWithAI recusa documento sem texto', async () => {
    await assert.rejects(() => extractTemplateWithAI({ text: '   ', apiKey: 'x' }), /pouco texto/)
})
