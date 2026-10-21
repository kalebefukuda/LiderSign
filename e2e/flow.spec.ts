import type { EnvelopeDetailDto, EnvelopeDto, FileCheckResponse, TemplateDto } from '@lidersign/shared'
import {
    expect,
    request as playwrightRequest,
    test,
    type APIRequestContext,
    type Page,
} from '@playwright/test'

const HUB_URL = process.env.E2E_LIDERHUB_URL ?? 'http://localhost:3001'
const SIGNER = { name: 'Maria Aparecida dos Santos' }
const CPF = '529.982.247-25'

let hub: APIRequestContext

test.beforeAll(async () => {
    hub = await playwrightRequest.newContext({
        baseURL: HUB_URL,
        extraHTTPHeaders: { 'X-LiderHub-Client': 'web' },
    })
})

test.afterAll(async () => {
    await hub.dispose()
})

async function resetDemo() {
    const reset = await hub.post('/api/reset')
    expect([204, 404]).toContain(reset.status())
}

async function activate() {
    const response = await hub.post('/api/lidersign/activate')
    expect(response.ok()).toBeTruthy()
}

async function createEnvelope(kind: 'CONTRATO' | 'PROCURACAO') {
    const templates: TemplateDto[] = await (await hub.get('/api/templates')).json()
    const template = templates.find((item) => item.kind === kind)
    expect(template, `modelo ${kind} do pacote inicial`).toBeTruthy()
    const response = await hub.post('/api/contracts', {
        data: { contactId: 'maria', templateId: template!.id, phone: '(47) 99999-0000' },
    })
    expect(response.status()).toBe(201)
    const envelope: EnvelopeDto = await response.json()
    expect(envelope.status).toBe('SENT')
    expect(envelope.signingUrl).toContain('/s/')
    return envelope
}

async function confirmCpf(page: Page) {
    await page.getByLabel('Para abrir, digite seu CPF').fill(CPF)
    await page.getByRole('button', { name: 'Abrir documento' }).click()
}

async function waitCompleted(envelopeId: string) {
    await expect
        .poll(
            async () => {
                const detail: EnvelopeDetailDto = await (await hub.get(`/api/contracts/${envelopeId}`)).json()
                return detail.status
            },
            { timeout: 45_000 },
        )
        .toBe('COMPLETED')
}

test.beforeEach(async () => {
    await resetDemo()
})

test('na LíderHub, o LíderSign ativa em um clique e o contrato sai pela conversa', async ({
    browser,
    context,
    page,
}) => {
    await page.goto(HUB_URL)
    await expect(page).toHaveURL(/\/integracoes/)
    const card = page.getByRole('article', { name: 'LíderSign' })
    await card.getByRole('button', { name: 'Ativar' }).click()
    await expect(card.getByText('Conectado')).toBeVisible()
    await page.getByRole('tab', { name: /Conectadas/ }).click()
    await expect(page.getByRole('article')).toHaveCount(1)

    await page
        .getByRole('navigation', { name: 'LíderHub' })
        .first()
        .getByRole('link', { name: 'Atendimento' })
        .click()
    await page.getByLabel('WhatsApp da Maria').fill('(47) 98888-7777')
    await page.getByRole('button', { name: 'Enviar para assinatura' }).click()
    const share = await page.getByRole('link', { name: 'Abrir no meu WhatsApp' }).getAttribute('href')
    expect(share).toContain('https://wa.me/5547988887777?text=')
    const signingUrl = decodeURIComponent(new URL(share!).searchParams.get('text') ?? '').match(
        /https?:\/\/\S+\/s\/[\w-]+/,
    )?.[0]
    expect(signingUrl).toBeTruthy()

    const phone = await browser.newPage({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
    })
    await phone.goto(new URL(signingUrl!).pathname)
    await confirmCpf(phone)
    await expect(phone.getByRole('img', { name: /Página 1 de/ })).toBeVisible()
    await phone.getByRole('button', { name: 'Continuar para assinar' }).click()
    await expect(phone.getByLabel('Sua assinatura')).toContainText(SIGNER.name)
    await phone.getByRole('button', { name: 'Assinar', exact: true }).click()
    await expect(phone.getByRole('heading', { name: 'Pronto! Documento assinado' })).toBeVisible()

    await expect(page.getByText('Maria assinou')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Contrato assinado.pdf')).toBeVisible({ timeout: 45_000 })

    await page
        .getByRole('navigation', { name: 'LíderHub' })
        .first()
        .getByRole('link', { name: /Contratos/ })
        .click()
    await expect(page.getByRole('cell', { name: /Maria Aparecida dos Santos/ })).toBeVisible()
    await page.getByRole('button', { name: /Assinados/ }).click()
    await expect(page.getByRole('link', { name: 'Baixar PDF assinado' })).toBeVisible()
    await page.getByRole('tab', { name: 'Modelos' }).click()
    await expect(
        page.frameLocator('iframe[title="Modelos do LíderSign"]').getByRole('heading', { name: 'Modelos' }),
    ).toBeVisible()

    const [panel] = await Promise.all([
        context.waitForEvent('page'),
        page.getByRole('link', { name: 'Abrir o LíderSign' }).click(),
    ])
    await expect(panel.getByText('Conectado à LíderHub')).toBeVisible()
    await expect(panel.getByRole('navigation', { name: 'Painel' }).getByRole('link')).toHaveText([
        'Início',
        'Documentos',
        'Modelos',
        'Configurações',
        'Desenvolvedores',
    ])

    await panel.goto('/painel/enviar')
    await panel.getByLabel('Celular (WhatsApp)').fill('(47) 98888-7777')
    await panel.getByRole('button', { name: 'Enviar para assinatura' }).click()
    await expect(panel.getByRole('heading', { name: 'Envie o link para Maria' })).toBeVisible()
    await expect(panel.getByAltText('QR code do link de assinatura')).toBeVisible()

    await page.goto(`${HUB_URL}/docs`)
    await expect(page.getByText('envelope.completed · HMAC válido')).toBeVisible({ timeout: 15_000 })
})

test('o painel só abre com a sessão criada pela LíderHub', async ({ page, request }) => {
    await activate()
    expect((await request.get('/v1/office/me')).status()).toBe(401)
    expect((await request.get('/v1/templates')).status()).toBe(401)

    const open = await hub.get('/api/lidersign/open?to=/painel/modelos', { maxRedirects: 0 })
    expect(open.status()).toBe(302)
    const entry = new URL(open.headers().location)
    expect(entry.pathname).toBe('/entrar')

    const enter = await request.get(`${entry.pathname}${entry.search}`, { maxRedirects: 0 })
    expect(enter.status()).toBe(302)
    expect(enter.headers().location).toBe('/painel/modelos')
    expect(enter.headers()['set-cookie']).toMatch(/ls_session=.+HttpOnly; SameSite=Lax/i)

    expect((await request.get('/v1/office/me')).status()).toBe(200)
    const forged = await request.post('/v1/envelopes', { data: {} })
    expect(forged.status()).toBe(403)

    const reused = await page.request.get(`${entry.pathname}${entry.search}`, { maxRedirects: 0 })
    expect(reused.headers().location).toBe('/painel?acesso=expirado')
    await page.goto('/painel')
    await expect(page.getByRole('heading', { name: 'Entre pela LíderHub' })).toBeVisible()
})

test('lead assina pelo celular e o escritório recebe o PDF selado', async ({ browser, request }) => {
    await activate()
    const envelope = await createEnvelope('CONTRATO')
    const token = new URL(envelope.signingUrl!).pathname.split('/').pop()!

    const before = await (await request.get(`/v1/sign/${token}`)).json()
    expect(before.identityConfirmed).toBe(false)
    expect(before.body).toBe('')
    expect((await request.get(`/v1/sign/${token}/document`)).status()).toBe(409)
    const wrong = await request.post(`/v1/sign/${token}/identity`, { data: { cpf: '111.444.777-35' } })
    expect(wrong.status()).toBe(422)

    const phone = await browser.newPage({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
    })
    await phone.goto(new URL(envelope.signingUrl!).pathname)
    await confirmCpf(phone)
    await expect(phone.getByLabel('Texto do documento')).toContainText(SIGNER.name)
    await phone.getByRole('button', { name: 'Continuar para assinar' }).click()

    const officeView = JSON.stringify(await (await hub.get(`/api/contracts/${envelope.id}`)).json())
    expect(officeView).not.toContain(token)

    await phone.getByRole('button', { name: 'Prefiro desenhar' }).click()
    await phone.getByRole('button', { name: 'Usar meu nome digitado' }).click()
    await phone.getByRole('button', { name: 'Assinar', exact: true }).click()

    await expect(phone.getByRole('heading', { name: 'Pronto! Documento assinado' })).toBeVisible()
    await waitCompleted(envelope.id)
    await expect(phone.getByRole('link', { name: /Baixar documento assinado/ })).toBeVisible({
        timeout: 30_000,
    })

    const signed = await (await hub.get(`/api/contracts/${envelope.id}/pdf`)).body()
    expect(signed.subarray(0, 5).toString()).toBe('%PDF-')

    const check = async (bytes: Buffer): Promise<FileCheckResponse> =>
        (
            await request.post('/v1/public/verify/file', {
                multipart: { file: { name: 'documento.pdf', mimeType: 'application/pdf', buffer: bytes } },
            })
        ).json()

    expect((await check(signed)).match).toBe(true)
    const tampered = Buffer.from(signed)
    tampered[Math.floor(tampered.length / 2)] ^= 0xff
    expect((await check(tampered)).match).toBe(false)

    await expect
        .poll(async () => {
            const received: { verified: boolean; event: string | null }[] = await (
                await hub.get('/api/webhooks')
            ).json()
            return received.some((item) => item.event === 'envelope.completed' && item.verified)
        })
        .toBe(true)

    await phone.goto(`/v/${envelope.verificationCode}`)
    await expect(phone.getByRole('heading', { name: 'Documento válido' })).toBeVisible()
    await phone.getByText('Detalhes técnicos e trilha de auditoria').click()
    await expect(phone.getByText('Íntegra: cada evento confere com o anterior')).toBeVisible()
})

test('procuração exige selfie no nível Reforçado', async ({ request }) => {
    await activate()
    const envelope = await createEnvelope('PROCURACAO')
    expect(envelope.assuranceLevel).toBe('REFORCADO')
    const token = new URL(envelope.signingUrl!).pathname.split('/').pop()!

    expect((await request.post(`/v1/sign/${token}/otp`)).status()).toBe(409)
    expect((await request.post(`/v1/sign/${token}/identity`, { data: { cpf: CPF } })).ok()).toBeTruthy()
    const otp: { demoCode?: string } = await (await request.post(`/v1/sign/${token}/otp`)).json()
    expect(otp.demoCode, 'código do WhatsApp simulado').toMatch(/^\d{6}$/)
    const verify = await request.post(`/v1/sign/${token}/otp/verify`, { data: { code: otp.demoCode } })
    expect(verify.ok()).toBeTruthy()

    const secret = await request.get('/v1/partner/tenants/escritorio-demo/webhook-secret')
    expect(secret.status()).toBe(401)

    const withoutSelfie = await request.post(`/v1/sign/${token}/complete`, {
        data: { signature: { type: 'typed', typedName: SIGNER.name }, consent: true },
    })
    expect(withoutSelfie.status()).toBe(409)
})

const PNG_1X1 = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    'base64',
)

test('o escritório põe a marca no link e acompanha os webhooks', async ({ request }) => {
    await activate()
    const open = await hub.get('/api/lidersign/open', { maxRedirects: 0 })
    const entry = new URL(open.headers().location)
    await request.get(`${entry.pathname}${entry.search}`, { maxRedirects: 0 })
    const headers = { 'X-LiderSign-Client': 'web' }

    const light = await request.patch('/v1/office/settings', { headers, data: { brandColor: '#fde047' } })
    expect(light.status()).toBe(422)
    const saved = await request.patch('/v1/office/settings', {
        headers,
        data: { brandColor: '#0F766E', linkValidityDays: 3, reminderAfterHours: 48 },
    })
    expect(saved.ok()).toBeTruthy()
    expect(await saved.json()).toMatchObject({
        brandColor: '#0f766e',
        linkValidityDays: 3,
        reminderAfterHours: 48,
    })

    const notImage = await request.put('/v1/office/logo', {
        headers,
        multipart: { file: { name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from('<svg></svg>') } },
    })
    expect(notImage.status()).toBe(400)
    const logo = await request.put('/v1/office/logo', {
        headers,
        multipart: { file: { name: 'logo.png', mimeType: 'image/png', buffer: PNG_1X1 } },
    })
    expect((await logo.json()).hasLogo).toBe(true)

    const envelope = await createEnvelope('CONTRATO')
    const days = (new Date(envelope.expiresAt).getTime() - Date.now()) / 86_400_000
    expect(days).toBeGreaterThan(2.9)
    expect(days).toBeLessThan(3.1)

    const token = new URL(envelope.signingUrl!).pathname.split('/').pop()!
    const session = await (await request.get(`/v1/sign/${token}`)).json()
    expect(session.branding).toEqual({ color: '#0f766e', hasLogo: true })
    const image = await request.get(`/v1/sign/${token}/logo`)
    expect(image.headers()['content-type']).toBe('image/png')

    await expect
        .poll(async () => {
            const deliveries: { event: string; ok: boolean }[] = await (
                await request.get('/v1/office/webhooks')
            ).json()
            return deliveries.some((item) => item.event === 'envelope.sent' && item.ok)
        })
        .toBe(true)
})
