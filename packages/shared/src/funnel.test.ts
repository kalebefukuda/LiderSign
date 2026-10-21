import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import type { EnvelopeDto } from './dto'
import { envelopeEntry, envelopeStage, summarizeFunnel } from './funnel'

const base = {
    status: 'SENT',
    viewedAt: null,
    identityConfirmedAt: null,
    signedAt: null,
} as Pick<EnvelopeDto, 'status' | 'viewedAt' | 'identityConfirmedAt' | 'signedAt'>

test('a etapa é a mais avançada que o contrato alcançou', () => {
    assert.equal(envelopeStage(base), 'SENT')
    assert.equal(envelopeStage({ ...base, status: 'VIEWED', viewedAt: '2026-10-21T10:00:00Z' }), 'VIEWED')
    assert.equal(envelopeStage({ ...base, identityConfirmedAt: '2026-10-21T10:01:00Z' }), 'IDENTITY')
    assert.equal(envelopeStage({ ...base, status: 'COMPLETED' }), 'SIGNED')
})

test('o funil conta quem chegou pelo menos a cada etapa', () => {
    const entry = (stage: EnvelopeDto['status'], extra: Partial<EnvelopeDto> = {}) =>
        envelopeEntry({
            id: Math.random().toString(36),
            title: 'Contrato',
            createdAt: '2026-10-21T10:00:00Z',
            sentAt: '2026-10-21T10:00:00Z',
            signer: { name: 'Maria', cpfMasked: '***.***.***-25', phoneMasked: '(47) 9****-0001' },
            ...base,
            status: stage,
            ...extra,
        } as EnvelopeDto)
    const summary = summarizeFunnel([
        entry('SENT'),
        entry('VIEWED', { viewedAt: '2026-10-21T10:05:00Z' }),
        entry('VIEWED', { viewedAt: '2026-10-21T10:05:00Z', identityConfirmedAt: '2026-10-21T10:06:00Z' }),
        entry('COMPLETED', { viewedAt: '2026-10-21T10:05:00Z', signedAt: '2026-10-21T10:07:00Z' }),
    ])
    assert.equal(summary.total, 4)
    assert.deepEqual(summary.reached, { SENT: 4, VIEWED: 3, IDENTITY: 2, SIGNED: 1 })
    assert.equal(summary.open, 3)
    assert.equal(summary.closingRate, 0.25)
})
