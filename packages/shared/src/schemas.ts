import { z } from 'zod'
import { isValidBrPhone, isValidCpf, normalizeBrPhone, onlyDigits } from './br'
import { ASSURANCE_LEVELS, TEMPLATE_KINDS, VARIABLE_TYPES } from './enums'

/* ---------- Parceiro (LíderHub) ---------- */

/** "Ativar LíderSign": a LíderHub cria a conta do escritório com a chave de parceiro. Idempotente. */
export const connectTenantSchema = z.object({
    externalId: z
        .string()
        .regex(/^[A-Za-z0-9_-]{3,64}$/, 'Use de 3 a 64 caracteres: letras, números, _ ou -'),
    name: z.string().trim().min(2).max(120),
    webhookUrl: z.url().max(500).optional(),
    /** Cria os modelos de exemplo (honorários BPC/LOAS e procuração). */
    starterPack: z.boolean().default(true),
})
export type ConnectTenantInput = z.infer<typeof connectTenantSchema>

/* ---------- Modelos ---------- */

export const templateVariableSchema = z.object({
    key: z.string().regex(/^[a-z][a-z0-9_]{0,47}$/, 'Chave em snake_case, começando por letra'),
    label: z.string().trim().min(1).max(80),
    type: z.enum(VARIABLE_TYPES).default('text'),
    example: z.string().max(200).optional(),
})
export type TemplateVariable = z.infer<typeof templateVariableSchema>

export const createTemplateSchema = z.object({
    name: z.string().trim().min(3).max(120),
    kind: z.enum(TEMPLATE_KINDS).default('CONTRATO'),
    assuranceLevel: z.enum(ASSURANCE_LEVELS).default('PADRAO'),
    body: z.string().min(20).max(60_000),
    variables: z.array(templateVariableSchema).max(60).default([]),
})
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>

export const updateTemplateSchema = createTemplateSchema.partial()
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>

/* ---------- Envelopes ---------- */

export const signerSchema = z.object({
    name: z.string().trim().min(3).max(120),
    cpf: z.string().transform(onlyDigits).refine(isValidCpf, 'CPF inválido'),
    phone: z
        .string()
        .refine(isValidBrPhone, 'Celular inválido: informe DDD + número')
        .transform(normalizeBrPhone),
    email: z.email().max(200).optional(),
})
export type SignerInput = z.input<typeof signerSchema>

export const createEnvelopeSchema = z.object({
    templateId: z.string().min(1).max(64),
    variables: z.record(z.string().regex(/^[a-z][a-z0-9_]*$/), z.string().max(2_000)).default({}),
    signer: signerSchema,
    /** Referência do lead/conversa na LíderHub, devolvida nos webhooks. */
    externalRef: z.string().max(120).optional(),
    /** Envia o link pelo WhatsApp na hora. Com false, só devolve o link. */
    send: z.boolean().default(true),
})
export type CreateEnvelopeInput = z.input<typeof createEnvelopeSchema>

/* ---------- Assinatura (público, via token) ---------- */

/** O signatário digita o próprio CPF para abrir o documento. */
export const confirmIdentitySchema = z.object({
    cpf: z
        .string()
        .transform((value) => value.replace(/\D/g, ''))
        .pipe(z.string().length(11, 'Digite os 11 números do CPF')),
})
export type ConfirmIdentityInput = z.infer<typeof confirmIdentitySchema>

export const verifyOtpSchema = z.object({
    code: z.string().regex(/^\d{6}$/, 'O código tem 6 números'),
})

const geolocationSchema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    accuracy: z.number().min(0).max(100_000).optional(),
})

export const completeSigningSchema = z
    .object({
        signature: z.discriminatedUnion('type', [
            z.object({
                type: z.literal('drawn'),
                /** PNG em data URL, até ~300 KB */
                imageDataUrl: z
                    .string()
                    .max(400_000)
                    .regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/, 'Assinatura inválida'),
            }),
            z.object({
                type: z.literal('typed'),
                typedName: z.string().trim().min(3).max(120),
            }),
        ]),
        consent: z.literal(true, { error: 'É preciso aceitar os termos para assinar' }),
        geolocation: geolocationSchema.optional(),
    })
    .strict()
export type CompleteSigningInput = z.infer<typeof completeSigningSchema>
