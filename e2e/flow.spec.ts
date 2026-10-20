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

test('ligar o LíderSign pela LíderHub cria o escritório e aparece no registro da integração', async ({ page }) => {
    await page.goto('/demo')
    await expect(page).toHaveURL(/\/desenvolvedores$/)
    const toggle = page.getByRole('switch', { name: 'Ativar LíderSign' })
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByText('Conta do escritório criada, com os modelos de exemplo')).toBeVisible()
})

test('escritório envia pelo painel e o cliente assina só com o CPF', async ({ browser, page, request }) => {
    // O painel abre pronto: o escritório de demonstração liga sozinho
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Envios' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Integração LíderHub' })).toHaveCount(0)

    await page.getByRole('link', { name: 'Enviar para assinatura' }).first().click()
    await expect(page.getByLabel('Nome completo')).toHaveValue(SIGNER.name)
    await page.getByRole('button', { name: 'Enviar para assinatura' }).click()
    await expect(page.getByText('Informe o celular (WhatsApp) de quem assina.')).toBeVisible()
    await page.getByLabel('Celular (WhatsApp)').fill('(47) 98888-7777')
    await page.getByRole('button', { name: 'Enviar para assinatura' }).click()

    await expect(page).toHaveURL(/\/painel\/envelopes\/[\w-]+$/)
    await expect(page.getByRole('heading', { name: 'Envie o link para Maria' })).toBeVisible()
    await expect(page.getByAltText('QR code do link de assinatura')).toBeVisible()
    const share = await page.getByRole('link', { name: 'Enviar pelo WhatsApp' }).getAttribute('href')
    expect(share).toContain('https://wa.me/5547988887777?text=')
    const signingUrl = decodeURIComponent(new URL(share!).searchParams.get('text') ?? '').match(/https?:\/\/\S+\/s\/[\w-]+/)?.[0]
    expect(signingUrl).toBeTruthy()
    const envelopeId = page.url().split('/').pop()!

    const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    await phone.goto(new URL(signingUrl!).pathname)
    await confirmCpf(phone)
    await expect(phone.getByRole('img', { name: /Página 1 de/ })).toBeVisible()
    await phone.getByRole('button', { name: 'Continuar para assinar' }).click()
    await expect(phone.getByLabel('Sua assinatura')).toContainText(SIGNER.name)
    await phone.getByRole('button', { name: 'Assinar', exact: true }).click()
    await expect(phone.getByRole('heading', { name: 'Pronto! Documento assinado' })).toBeVisible()

    await waitCompleted(request, envelopeId)
    await expect(page.getByRole('heading', { name: 'Maria assinou' })).toBeVisible({ timeout: 15_000 })
    await page.goto('/desenvolvedores')
    await expect(page.getByText('envelope.completed · HMAC válido')).toBeVisible({ timeout: 15_000 })
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

    const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    await phone.goto(new URL(envelope.signingUrl!).pathname)
    await confirmCpf(phone)
    await expect(phone.getByLabel('Texto do documento')).toContainText(SIGNER.name)
    await phone.getByRole('button', { name: 'Continuar para assinar' }).click()

    // O escritório nunca vê o token do link
    const officeView = JSON.stringify(await (await request.get(`/demo-host/v1/envelopes/${envelope.id}`)).json())
    expect(officeView).not.toContain(token)

    await phone.getByRole('button', { name: 'Prefiro desenhar' }).click()
    await phone.getByRole('button', { name: 'Usar meu nome digitado' }).click()
    await phone.getByRole('button', { name: 'Assinar', exact: true }).click()

    await expect(phone.getByRole('heading', { name: 'Pronto! Documento assinado' })).toBeVisible()
    await waitCompleted(request, envelope.id)
    await expect(phone.getByRole('link', { name: /Baixar documento assinado/ })).toBeVisible({ timeout: 30_000 })

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
    const verify = await request.post(`/v1/sign/${token}/otp/verify`, { data: { code: await latestOtp(request) } })
    expect(verify.ok()).toBeTruthy()

    // O proxy da demo não deixa passar rotas de parceiro (ex.: segredo do webhook)
    const secret = await request.get('/demo-host/v1/partner/tenants/escritorio-demo/webhook-secret')
    expect(secret.status()).toBe(404)

    const withoutSelfie = await request.post(`/v1/sign/${token}/complete`, {
        data: { signature: { type: 'typed', typedName: SIGNER.name }, consent: true },
    })
    expect(withoutSelfie.status()).toBe(409)
})
