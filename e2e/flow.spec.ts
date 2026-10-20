import type {
    EnvelopeDetailDto,
    EnvelopeDto,
    FileCheckResponse,
    MessageDto,
    TemplateDto,
} from '@lidersign/shared'
import { expect, test, type APIRequestContext } from '@playwright/test'

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

test('ligar o LíderSign cria o escritório e aparece no registro da integração', async ({ page }) => {
    await page.goto('/demo')
    await expect(page).toHaveURL(/\/painel\/integracao$/)
    const toggle = page.getByRole('switch', { name: 'Ativar LíderSign' })
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByText('Conta do escritório criada, com os modelos de exemplo')).toBeVisible()
})

test('escritório envia pelo painel e assina pelo QR code, com o código na tela no modo demonstração', async ({
    browser,
    page,
    request,
}) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/painel/)
    await page.getByRole('button', { name: 'Ativar o escritório de demonstração' }).click()
    await expect(page.getByRole('heading', { name: 'Envios' })).toBeVisible()

    await page.getByRole('link', { name: 'Enviar para assinatura' }).first().click()
    await expect(page.getByLabel('Nome completo')).toHaveValue(SIGNER.name)
    await page.getByRole('button', { name: 'Enviar para assinatura' }).click()

    await expect(page).toHaveURL(/\/painel\/envelopes\/[\w-]+$/)
    await expect(page.getByAltText('QR code do link de assinatura')).toBeVisible()
    const signingUrl = await page.getByRole('link', { name: 'Abrir neste computador' }).getAttribute('href')
    expect(signingUrl).toContain('/s/')
    const envelopeId = page.url().split('/').pop()!

    const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    await phone.goto(new URL(signingUrl!).pathname)
    await phone.getByRole('button', { name: 'Sou eu, continuar' }).click()
    await phone.getByRole('button', { name: 'Li o documento, continuar' }).click()
    await phone.getByRole('button', { name: 'Enviar código no WhatsApp' }).click()

    // Sem WhatsApp configurado, o código aparece na própria tela de assinatura
    await expect(phone.getByText('Modo demonstração')).toBeVisible()
    await phone.getByRole('button', { name: 'Usar este código' }).click()

    await phone.getByRole('tab', { name: 'Digitar nome' }).click()
    await phone.getByLabel('Seu nome completo').fill(SIGNER.name)
    await phone.getByRole('checkbox').check()
    await phone.getByRole('button', { name: 'Assinar documento' }).click()
    await expect(phone.getByRole('heading', { name: 'Pronto! Documento assinado' })).toBeVisible()

    await waitCompleted(request, envelopeId)
    await page.goto('/painel/integracao')
    await expect(page.getByText('envelope.completed · HMAC válido')).toBeVisible({ timeout: 15_000 })
})

test('lead assina pelo celular e o escritório recebe o PDF selado', async ({ browser, request }) => {
    await activate(request)
    const envelope = await createEnvelope(request, 'CONTRATO')

    const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    await phone.goto(new URL(envelope.signingUrl!).pathname)

    await phone.getByRole('button', { name: 'Sou eu, continuar' }).click()
    await expect(phone.getByLabel('Texto do documento')).toContainText(SIGNER.name)
    await phone.getByRole('button', { name: 'Li o documento, continuar' }).click()

    await phone.getByRole('button', { name: 'Enviar código no WhatsApp' }).click()
    const code = await latestOtp(request)

    // O escritório nunca vê o código nem o token do link: só o signatário, no WhatsApp.
    const officeView = JSON.stringify(await (await request.get(`/demo-host/v1/envelopes/${envelope.id}`)).json())
    expect(officeView).not.toContain(code)
    expect(officeView).not.toContain(new URL(envelope.signingUrl!).pathname.split('/').pop()!)

    await phone.getByLabel('Código de 6 números').fill(code)

    await phone.getByRole('tab', { name: 'Digitar nome' }).click()
    await phone.getByLabel('Seu nome completo').fill(SIGNER.name)
    await phone.getByRole('checkbox').check()
    await phone.getByRole('button', { name: 'Assinar documento' }).click()

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

    // A verificação pública mostra o documento como autêntico.
    await phone.goto(`/v/${envelope.verificationCode}`)
    await expect(phone.getByText('Documento autêntico')).toBeVisible()
    await expect(phone.getByText('Íntegra: cada evento confere com o anterior')).toBeVisible()
})

test('procuração exige selfie no nível Reforçado', async ({ request }) => {
    await activate(request)
    const envelope = await createEnvelope(request, 'PROCURACAO')
    expect(envelope.assuranceLevel).toBe('REFORCADO')
    const token = new URL(envelope.signingUrl!).pathname.split('/').pop()!

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
