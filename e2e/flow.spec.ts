import type {
    EnvelopeDetailDto,
    EnvelopeDto,
    FileCheckResponse,
    MessageDto,
    TemplateDto,
} from '@lidersign/shared'
import { expect, test, type APIRequestContext, type Page } from '@playwright/test'

/**
 * O fluxo que a LíderHub precisa: ativar em um clique, gerar o contrato com os dados do lead,
 * o lead assinar pelo celular e o escritório receber o PDF selado, verificável e protegido contra alteração.
 */

const SIGNER = { name: 'Maria Aparecida dos Santos', cpf: '52998224725', phone: '47999990000' }

async function resetDemo(request: APIRequestContext) {
    const reset = await request.post('/demo-host/v1/demo/reset')
    expect([204, 404]).toContain(reset.status())
}

async function activate(request: APIRequestContext) {
    const response = await request.post('/demo-host/activate')
    expect(response.ok()).toBeTruthy()
}

async function createEnvelope(request: APIRequestContext, kind: 'CONTRATO' | 'PROCURACAO') {
    const templates: TemplateDto[] = await (await request.get('/demo-host/v1/templates')).json()
    const template = templates.find((item) => item.kind === kind)
    expect(template, `modelo ${kind} do pacote inicial`).toBeTruthy()

    const variables = Object.fromEntries(
        template!.variables.map((variable) => [variable.key, variable.example ?? variable.label]),
    )
    variables.nome_cliente = SIGNER.name
    variables.cpf_cliente = '529.982.247-25'

    const response = await request.post('/demo-host/v1/envelopes', {
        data: { templateId: template!.id, variables, signer: SIGNER, externalRef: 'lead-e2e' },
    })
    expect(response.status()).toBe(201)
    const envelope: EnvelopeDto = await response.json()
    expect(envelope.status).toBe('SENT')
    expect(envelope.signingUrl).toContain('/s/')
    return envelope
}

const CPF = '529.982.247-25'

async function confirmCpf(page: Page) {
    await page.getByLabel('Para abrir, digite seu CPF').fill(CPF)
    await page.getByRole('button', { name: 'Abrir documento' }).click()
}

async function latestOtp(request: APIRequestContext) {
    const messages: MessageDto[] = await (await request.get('/demo-host/v1/demo/messages')).json()
    const otp = [...messages].reverse().find((message) => message.kind === 'OTP')
    const code = otp?.body.match(/\b(\d{6})\b/)?.[1]
    expect(code, 'código no WhatsApp simulado').toBeTruthy()
    return code!
}

async function waitCompleted(request: APIRequestContext, envelopeId: string) {
    await expect
        .poll(
            async () => {
                const detail: EnvelopeDetailDto = await (
                    await request.get(`/demo-host/v1/envelopes/${envelopeId}`)
                ).json()
                return detail.status
            },
            { timeout: 45_000 },
        )
        .toBe('COMPLETED')
}

test.beforeEach(async ({ request }) => {
    await resetDemo(request)
})

test('na LíderHub, ativar o LíderSign é um switch e o contrato sai pela conversa', async ({
    browser,
    page,
    request,
}) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/liderhub/)
    const toggle = page.getByRole('switch', { name: 'Ativar LíderSign' })
    await expect(toggle).toBeEnabled()
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByText('Conta do escritório criada, com os modelos de exemplo')).toBeVisible()

    await page
        .getByRole('navigation', { name: 'LíderHub' })
        .getByRole('button', { name: 'Atendimento' })
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

    // O status volta para a conversa da LíderHub, com o PDF
    await expect(page.getByText('Maria assinou')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Contrato assinado.pdf')).toBeVisible({ timeout: 45_000 })

    // Os contratos ficam dentro da LíderHub: lista com filtro e modelos embutidos
    await page
        .getByRole('navigation', { name: 'LíderHub' })
        .getByRole('button', { name: /Contratos/ })
        .click()
    await expect(page.getByRole('cell', { name: /Maria Aparecida dos Santos/ })).toBeVisible()
    await page.getByRole('button', { name: /Assinados/ }).click()
    await expect(page.getByRole('link', { name: 'Baixar PDF assinado' })).toBeVisible()
    await page.getByRole('tab', { name: 'Modelos' }).click()
    await expect(
        page.frameLocator('iframe[title="Modelos do LíderSign"]').getByRole('heading', { name: 'Modelos' }),
    ).toBeVisible()

    // O painel do LíderSign é o bastidor: conexão, resumo e documentos
    await page.goto('/painel')
    await expect(page.getByText('Conectado à LíderHub')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Painel' }).getByRole('link')).toHaveText([
        'Início',
        'Documentos',
        'Modelos',
    ])

    // Envio avulso continua possível, com o link para mandar pelo WhatsApp
    await page.goto('/painel/enviar')
    await page.getByLabel('Celular (WhatsApp)').fill('(47) 98888-7777')
    await page.getByRole('button', { name: 'Enviar para assinatura' }).click()
    await expect(page.getByRole('heading', { name: 'Envie o link para Maria' })).toBeVisible()
    await expect(page.getByAltText('QR code do link de assinatura')).toBeVisible()

    await page.goto('/desenvolvedores')
    await expect(page.getByText('envelope.completed · HMAC válido')).toBeVisible({ timeout: 15_000 })
    void request
})

test('pelo endereço público só abrem a assinatura e a verificação', async ({ request }) => {
    const viaTunnel = { 'cf-ray': 'teste', 'cf-connecting-ip': '203.0.113.7' }
    expect((await request.get('/demo-host/status', { headers: viaTunnel })).status()).toBe(404)
    for (const path of ['/', '/painel', '/painel/envelopes', '/liderhub', '/desenvolvedores']) {
        const response = await request.get(path, { headers: viaTunnel, maxRedirects: 0 })
        expect(response.status(), path).toBe(302)
        expect(response.headers().location).toBe('/v')
    }
    expect((await request.get('/v', { headers: viaTunnel })).status()).toBe(200)
    expect((await request.get('/demo-host/status')).status()).toBe(200)
})

test('lead assina pelo celular e o escritório recebe o PDF selado', async ({ browser, request }) => {
    await activate(request)
    const envelope = await createEnvelope(request, 'CONTRATO')
    const token = new URL(envelope.signingUrl!).pathname.split('/').pop()!

    // Sem o CPF, o link sozinho não mostra o documento
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

    // O escritório nunca vê o token do link
    const officeView = JSON.stringify(
        await (await request.get(`/demo-host/v1/envelopes/${envelope.id}`)).json(),
    )
    expect(officeView).not.toContain(token)

    await phone.getByRole('button', { name: 'Prefiro desenhar' }).click()
    await phone.getByRole('button', { name: 'Usar meu nome digitado' }).click()
    await phone.getByRole('button', { name: 'Assinar', exact: true }).click()

    await expect(phone.getByRole('heading', { name: 'Pronto! Documento assinado' })).toBeVisible()
    await waitCompleted(request, envelope.id)
    await expect(phone.getByRole('link', { name: /Baixar documento assinado/ })).toBeVisible({
        timeout: 30_000,
    })

    // O PDF selado confere na verificação pública; uma cópia alterada não confere.
    const signed = await (await request.get(`/demo-host/v1/envelopes/${envelope.id}/files/signed`)).body()
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

    // A LíderHub recebeu os webhooks com HMAC válido.
    await expect
        .poll(async () => {
            const received: { verified: boolean; payload: { event: string } }[] = await (
                await request.get('/demo-host/webhooks')
            ).json()
            return received.some((item) => item.payload.event === 'envelope.completed' && item.verified)
        })
        .toBe(true)

    // A verificação pública responde em linguagem simples; o técnico fica recolhido.
    await phone.goto(`/v/${envelope.verificationCode}`)
    await expect(phone.getByRole('heading', { name: 'Documento válido' })).toBeVisible()
    await phone.getByText('Detalhes técnicos e trilha de auditoria').click()
    await expect(phone.getByText('Íntegra: cada evento confere com o anterior')).toBeVisible()
})

test('procuração exige selfie no nível Reforçado', async ({ request }) => {
    await activate(request)
    const envelope = await createEnvelope(request, 'PROCURACAO')
    expect(envelope.assuranceLevel).toBe('REFORCADO')
    const token = new URL(envelope.signingUrl!).pathname.split('/').pop()!

    // No Reforçado, o código no WhatsApp vem depois do CPF
    expect((await request.post(`/v1/sign/${token}/otp`)).status()).toBe(409)
    expect((await request.post(`/v1/sign/${token}/identity`, { data: { cpf: CPF } })).ok()).toBeTruthy()
    await request.post(`/v1/sign/${token}/otp`)
    const verify = await request.post(`/v1/sign/${token}/otp/verify`, {
        data: { code: await latestOtp(request) },
    })
    expect(verify.ok()).toBeTruthy()

    // O proxy da demo não deixa passar rotas de parceiro (ex.: segredo do webhook)
    const secret = await request.get('/demo-host/v1/partner/tenants/escritorio-demo/webhook-secret')
    expect(secret.status()).toBe(404)

    const withoutSelfie = await request.post(`/v1/sign/${token}/complete`, {
        data: { signature: { type: 'typed', typedName: SIGNER.name }, consent: true },
    })
    expect(withoutSelfie.status()).toBe(409)
})
