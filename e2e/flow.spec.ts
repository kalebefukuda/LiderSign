import type {
    AssistantReply,
    ConversationDto,
    EnvelopeDetailDto,
    EnvelopeDto,
    FileCheckResponse,
    SimulatorInboundInput,
    TemplateDto,
} from '@lidersign/shared'
import { expect, test, type APIRequestContext } from '@playwright/test'

const WEB = { 'X-LiderSign-Client': 'web' }
const CPF_MARIA = '529.982.247-25'
const CPF_JOAO = '714.602.380-01'

async function login(request: APIRequestContext) {
    expect((await request.post('/v1/session/demo', { headers: WEB })).status()).toBe(204)
    expect((await request.post('/v1/session/demo/reset', { headers: WEB })).status()).toBe(204)
}

async function templateOf(request: APIRequestContext, kind: 'CONTRATO' | 'PROCURACAO') {
    const templates: TemplateDto[] = await (await request.get('/v1/templates')).json()
    const template = templates.find((item) => item.kind === kind)
    expect(template, `modelo ${kind} do pacote inicial`).toBeTruthy()
    return template!
}

async function send(
    request: APIRequestContext,
    contactId: string,
    kind: 'CONTRATO' | 'PROCURACAO',
    channel: 'WHATSAPP' | 'LINK' = 'WHATSAPP',
) {
    const template = await templateOf(request, kind)
    const response = await request.post(`/v1/contacts/${contactId}/contracts`, {
        headers: WEB,
        data: { templateId: template.id, channel },
    })
    expect(response.status()).toBe(201)
    return (await response.json()) as EnvelopeDto
}

async function say(request: APIRequestContext, input: SimulatorInboundInput) {
    const response = await request.post('/v1/whatsapp/simulator', { headers: WEB, data: input })
    expect(response.status()).toBe(202)
}

async function conversation(
    request: APIRequestContext,
    contactId: string,
    view: 'office' | 'client' = 'office',
) {
    const response = await request.get(
        `/v1/contacts/${contactId}/conversation${view === 'client' ? '?view=client' : ''}`,
    )
    expect(response.ok()).toBeTruthy()
    return (await response.json()) as ConversationDto
}

async function lastFromOffice(request: APIRequestContext, contactId: string) {
    const { messages } = await conversation(request, contactId)
    return messages.filter((message) => message.direction === 'OUT').at(-1)!
}

async function waitStatus(request: APIRequestContext, id: string, status: string) {
    await expect
        .poll(
            async () =>
                ((await (await request.get(`/v1/envelopes/${id}`)).json()) as EnvelopeDetailDto).status,
            {
                timeout: 45_000,
            },
        )
        .toBe(status)
}

const PNG_1X1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64',
)

test('o cliente assina dentro da conversa do WhatsApp e o escritório é avisado', async ({ page }) => {
    await login(page.request)
    await page.goto('/atendimento')
    await expect(page.getByText('Pode mandar o contrato então.').first()).toBeVisible()

    await page.getByRole('button', { name: 'Enviar contrato' }).first().click()
    await page.getByRole('button', { name: 'Enviar na conversa' }).click()
    await expect(page.getByText('Celular de Maria (simulado)')).toBeVisible()

    const message = page.getByLabel('Mensagem do cliente')
    await message.fill('111.444.777-35')
    await message.press('Enter')
    await expect(page.getByText(/não confere com o do documento/).first()).toBeVisible()
    await message.fill(CPF_MARIA)
    await message.press('Enter')
    await expect(page.getByText('Toque para abrir').first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ouvir áudio' }).first()).toBeVisible()

    await page.getByRole('button', { name: 'Tenho uma dúvida' }).last().click()
    await expect(page.getByText('Escreva a sua dúvida que eu explico.').first()).toBeVisible()
    await message.fill('Quanto vou ter que pagar?')
    await message.press('Enter')
    await expect(page.getByText(/honorários de 30%/).first()).toBeVisible()

    await page.getByRole('button', { name: 'Assinar', exact: true }).last().click()
    await expect(page.getByText('Sua via assinada, com o selo de integridade.').first()).toBeVisible({
        timeout: 45_000,
    })
    await expect(page.getByRole('button', { name: /Notificações, 1 nova/ })).toBeVisible()
    await expect(page.getByText(/Carimbo do tempo/).first()).toBeVisible()

    await page.goto('/contratos')
    await expect(page.getByText('Onde as pessoas param')).toBeVisible()
    await page.getByRole('link', { name: 'Maria Aparecida dos Santos', exact: true }).click()
    await expect(page.getByText('Garantias do documento')).toBeVisible()

    const contacts: { id: string; contract: EnvelopeDto | null }[] = await (
        await page.request.get('/v1/contacts')
    ).json()
    const envelope = contacts.find((item) => item.id === 'maria')!.contract!
    const signed = await (await page.request.get(`/v1/envelopes/${envelope.id}/files/signed`)).body()
    expect(signed.subarray(0, 5).toString()).toBe('%PDF-')
    const check = async (bytes: Buffer): Promise<FileCheckResponse> =>
        (
            await page.request.post('/v1/public/verify/file', {
                multipart: { file: { name: 'documento.pdf', mimeType: 'application/pdf', buffer: bytes } },
            })
        ).json()
    expect((await check(signed)).match).toBe(true)
    const tampered = Buffer.from(signed)
    tampered[Math.floor(tampered.length / 2)] ^= 0xff
    expect((await check(tampered)).match).toBe(false)

    await page.goto(`/v/${envelope.verificationCode}`)
    await expect(page.getByRole('heading', { name: 'Documento válido' })).toBeVisible()
})

test('procuração pede selfie pela câmera do WhatsApp antes de assinar', async ({ request }) => {
    await login(request)
    const envelope = await send(request, 'joao', 'PROCURACAO')
    expect(envelope.assuranceLevel).toBe('REFORCADO')
    expect(envelope.signingUrl).toBeNull()

    await say(request, { type: 'text', contactId: 'joao', text: 'oi' })
    expect((await lastFromOffice(request, 'joao')).body).toContain('11 números')
    await say(request, { type: 'text', contactId: 'joao', text: CPF_JOAO })
    expect((await lastFromOffice(request, 'joao')).type).toBe('BUTTONS')
    await say(request, { type: 'button', contactId: 'joao', buttonId: 'sign' })
    expect((await lastFromOffice(request, 'joao')).body).toContain('selfie')
    await say(request, {
        type: 'image',
        contactId: 'joao',
        imageDataUrl: `data:image/png;base64,${PNG_1X1.toString('base64')}`,
    })
    await waitStatus(request, envelope.id, 'COMPLETED')

    const detail: EnvelopeDetailDto = await (await request.get(`/v1/envelopes/${envelope.id}`)).json()
    const events = detail.events.map((event) => event.type)
    expect(events).toEqual(
        expect.arrayContaining([
            'WHATSAPP_STARTED',
            'IDENTITY_CONFIRMED',
            'SELFIE_CAPTURED',
            'DOCUMENT_SIGNED',
            'DOCUMENT_SEALED',
        ]),
    )
    const copy = (await conversation(request, 'joao')).messages.find(
        (message) => message.type === 'DOCUMENT' && message.payload?.document?.file === 'signed',
    )
    expect(copy?.url).toMatch(/^\/v1\/whatsapp\/media\//)
    const pdf = await request.get(copy!.url!)
    expect(pdf.headers()['content-type']).toBe('application/pdf')
    expect((await request.get(copy!.url!.replace(/sig=[^&]+/, 'sig=invalida'))).status()).toBe(404)
})

test('o link continua como plano B, pedido de dentro da conversa', async ({ browser, request }) => {
    await login(request)
    const envelope = await send(request, 'antonio', 'CONTRATO')
    await say(request, { type: 'text', contactId: 'antonio', text: '24681357090' })
    await say(request, { type: 'button', contactId: 'antonio', buttonId: 'browser' })

    const office = await lastFromOffice(request, 'antonio')
    expect(office.kind).toBe('SIGNING_LINK')
    expect(office.body).not.toMatch(/\/s\/[\w-]{20,}/)
    const client = (await conversation(request, 'antonio', 'client')).messages
        .filter((m) => m.kind === 'SIGNING_LINK')
        .at(-1)!
    const url = client.body.match(/https?:\/\/\S+\/s\/[\w-]+/)?.[0]
    expect(url).toBeTruthy()

    const phone = await browser.newPage({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
    })
    await phone.goto(new URL(url!).pathname)
    // Link encaminhado não abre sozinho: no navegador, o CPF é pedido de novo
    await phone.getByLabel('Para abrir, digite seu CPF').fill('246.813.570-90')
    await phone.getByRole('button', { name: 'Abrir documento' }).click()
    await phone.getByRole('button', { name: 'Continuar para assinar' }).click()
    await phone.getByRole('button', { name: 'Assinar', exact: true }).click()
    await expect(phone.getByRole('heading', { name: 'Pronto! Documento assinado' })).toBeVisible()
    await waitStatus(request, envelope.id, 'COMPLETED')
    await expect
        .poll(async () =>
            (await conversation(request, 'antonio')).messages.some((m) => m.kind === 'SIGNED_COPY'),
        )
        .toBe(true)
})

test('a área do escritório só abre com sessão local e cada escrita pede o cabeçalho', async ({
    request,
    playwright,
}) => {
    expect((await request.get('/v1/office/me')).status()).toBe(401)
    expect((await request.get('/v1/contacts')).status()).toBe(401)
    expect((await request.post('/v1/session/demo')).status()).toBe(403)
    expect(
        (await request.post('/v1/session/demo', { headers: { ...WEB, 'cf-ray': 'teste' } })).status(),
    ).toBe(403)
    const remote = await (
        await request.get('/v1/session', { headers: { 'cf-connecting-ip': '200.1.2.3' } })
    ).json()
    expect(remote.loginAvailable).toBe(false)

    await login(request)
    expect((await request.get('/v1/office/me')).status()).toBe(200)
    const forged = await request.post('/v1/contacts/maria/messages', { data: { text: 'oi' } })
    expect(forged.status()).toBe(403)
    expect((await request.post('/v1/whatsapp/webhook', { data: {} })).status()).toBe(404)
    expect(
        (
            await request.get('/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=x&hub.challenge=1')
        ).status(),
    ).toBe(403)
    expect((await request.get('/v1/partner/tenants/escritorio-demo/webhook-secret')).status()).toBe(401)

    const anonymous = await playwright.request.newContext({ baseURL: test.info().project.use.baseURL })
    expect((await anonymous.post('/v1/whatsapp/simulator', { headers: WEB, data: {} })).status()).toBe(401)
    await anonymous.dispose()

    await send(request, 'maria', 'CONTRATO')
    await say(request, { type: 'text', contactId: 'maria', text: CPF_MARIA })
    for (const view of ['office', 'client'] as const) {
        const text = JSON.stringify(await conversation(request, 'maria', view))
        expect(text).not.toContain(CPF_MARIA)
        expect(text).not.toContain('52998224725')
        expect(text).not.toContain('5547900000001')
        expect(text).toContain('***.***.***-25')
    }
})

test('o Assistente lista quem parou, lembra e cria modelo a partir de um arquivo', async ({ request }) => {
    await login(request)
    await send(request, 'carla', 'CONTRATO')

    const pending: AssistantReply = await (
        await request.post('/v1/assistant', {
            headers: WEB,
            data: { message: 'Quem ainda não assinou?', page: 'contratos' },
        })
    ).json()
    expect(pending.reply).toContain('Carla M.')
    expect(pending.lookups).toBeGreaterThan(0)
    expect(pending.reply).not.toContain('385.112.960-18')

    const summary: AssistantReply = await (
        await request.post('/v1/assistant', { headers: WEB, data: { message: 'qual a taxa de fechamento?' } })
    ).json()
    expect(summary.reply).toContain('ZapSign')

    const contract = Buffer.from(
        'CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS\n\nContratante: João da Silva, CPF 123.456.789-09, residente em Rua A, 10, Joinville/SC.\nContratado: Souza Advocacia.\n\nHonorários de 20% sobre o proveito econômico.\n\nJoinville, 10 de outubro de 2026.',
    )
    const created = await request.post('/v1/assistant/template', {
        headers: WEB,
        multipart: { file: { name: 'contrato-exemplo.txt', mimeType: 'text/plain', buffer: contract } },
    })
    expect(created.ok()).toBeTruthy()
    const reply: AssistantReply = await created.json()
    const action = reply.actions.find((item) => item.type === 'template.created')
    expect(action).toBeTruthy()
    const templates: TemplateDto[] = await (await request.get('/v1/templates')).json()
    expect(templates.length).toBe(3)
})

test('o escritório põe a marca no link do plano B', async ({ request }) => {
    await login(request)
    const light = await request.patch('/v1/office/settings', {
        headers: WEB,
        data: { brandColor: '#fde047' },
    })
    expect(light.status()).toBe(422)
    const saved = await request.patch('/v1/office/settings', {
        headers: WEB,
        data: { brandColor: '#0F766E', linkValidityDays: 3, reminderAfterHours: 48 },
    })
    expect(await saved.json()).toMatchObject({
        brandColor: '#0f766e',
        linkValidityDays: 3,
        reminderAfterHours: 48,
    })
    const notImage = await request.put('/v1/office/logo', {
        headers: WEB,
        multipart: { file: { name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from('<svg></svg>') } },
    })
    expect(notImage.status()).toBe(400)
    const logo = await request.put('/v1/office/logo', {
        headers: WEB,
        multipart: { file: { name: 'logo.png', mimeType: 'image/png', buffer: PNG_1X1 } },
    })
    expect((await logo.json()).hasLogo).toBe(true)

    const envelope = await send(request, 'maria', 'CONTRATO', 'LINK')
    const days = (new Date(envelope.expiresAt).getTime() - Date.now()) / 86_400_000
    expect(days).toBeGreaterThan(2.9)
    expect(days).toBeLessThan(3.1)
    const token = new URL(envelope.signingUrl!).pathname.split('/').pop()!
    const session = await (await request.get(`/v1/sign/${token}`)).json()
    expect(session.branding).toEqual({ color: '#0f766e', hasLogo: true })
    expect((await request.get(`/v1/sign/${token}/logo`)).headers()['content-type']).toBe('image/png')
})
