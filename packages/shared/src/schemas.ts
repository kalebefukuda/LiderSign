import { z } from 'zod'
import { isReadableBrandColor, isValidBrPhone, isValidCpf, normalizeBrPhone, onlyDigits } from './br'
import { ASSURANCE_LEVELS, REMINDER_HOURS, SIGNING_CHANNELS, TEMPLATE_KINDS, VARIABLE_TYPES } from './enums'

export const connectTenantSchema = z.object({
    externalId: z
        .string()
        .regex(/^[A-Za-z0-9_-]{3,64}$/, 'Use de 3 a 64 caracteres: letras, números, _ ou -'),
    name: z.string().trim().min(2).max(120),
    webhookUrl: z.url().max(500).optional(),
    starterPack: z.boolean().default(true),
})
export type ConnectTenantInput = z.infer<typeof connectTenantSchema>

export const updateOfficeSettingsSchema = z
    .object({
        brandColor: z
            .string()
            .regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor no formato #RRGGBB')
            .refine(isReadableBrandColor, 'Escolha uma cor mais escura: o texto branco precisa ficar legível')
            .transform((value) => value.toLowerCase())
            .nullable(),
        linkValidityDays: z.number().int().min(1).max(30),
        reminderEnabled: z.boolean(),
        reminderAfterHours: z
            .number()
            .int()
            .refine(
                (value) => (REMINDER_HOURS as readonly number[]).includes(value),
                'Escolha 24, 48 ou 72 horas',
            ),
    })
    .partial()
export type UpdateOfficeSettingsInput = z.infer<typeof updateOfficeSettingsSchema>

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
    externalRef: z.string().max(120).optional(),
    send: z.boolean().default(true),
    channel: z.enum(SIGNING_CHANNELS).default('LINK'),
})
export type CreateEnvelopeInput = z.input<typeof createEnvelopeSchema>

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

export const sendContractSchema = z.object({
    templateId: z.string().min(1).max(64),
    channel: z.enum(SIGNING_CHANNELS).default('WHATSAPP'),
    phone: z
        .string()
        .max(30)
        .optional()
        .refine((value) => !value || isValidBrPhone(value), 'Informe o WhatsApp com DDD')
        .transform((value) => (value ? normalizeBrPhone(value) : undefined)),
})
export type SendContractInput = z.input<typeof sendContractSchema>

export const simulatorInboundSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('text'),
        contactId: z.string().min(1).max(64),
        text: z.string().trim().min(1).max(2_000),
    }),
    z.object({
        type: z.literal('button'),
        contactId: z.string().min(1).max(64),
        buttonId: z.string().min(1).max(64),
    }),
    z.object({
        type: z.literal('image'),
        contactId: z.string().min(1).max(64),
        imageDataUrl: z
            .string()
            .max(7_000_000)
            .regex(/^data:image\/(png|jpeg|webp);base64,/, 'Envie uma foto em PNG, JPG ou WEBP'),
    }),
])
export type SimulatorInboundInput = z.infer<typeof simulatorInboundSchema>

export const assistantMessageSchema = z.object({
    message: z.string().trim().min(1).max(2_000),
    page: z.enum(['atendimento', 'contratos', 'modelos', 'configuracoes']).default('atendimento'),
    history: z
        .array(z.object({ role: z.enum(['user', 'assistant']), text: z.string().max(4_000) }))
        .max(20)
        .default([]),
})
export type AssistantMessageInput = z.input<typeof assistantMessageSchema>

export const officeMessageSchema = z.object({
    text: z.string().trim().min(1).max(2_000),
})
export type OfficeMessageInput = z.infer<typeof officeMessageSchema>
