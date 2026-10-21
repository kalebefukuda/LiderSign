import type {
    ConnectTenantResponse,
    EnvelopeDetailDto,
    EnvelopeDto,
    OfficeSessionResponse,
    TemplateDto,
    TenantDto,
} from '@lidersign/shared'
import express, { type NextFunction, type Request, type Response } from 'express'
import { Readable } from 'node:stream'
import type { ReadableStream } from 'node:stream/web'
import { clearCalls, listCalls } from './call-log.js'
import { config } from './config.js'
import { call, LiderSignError, officePath, raw } from './lidersign.js'
import { CONTACTS, fillVariables } from './office.js'
import { broadcast, forgetWebhooks, listWebhooks, receive, rememberSecret, subscribe } from './webhooks.js'

const ID = /^[A-Za-z0-9_-]{1,64}$/
const OFFICE_PATH = /^\/painel(?:\/[A-Za-z0-9_-]+)*\/?$/
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export type HostStatus = {
    active: boolean
    office: { id: string; name: string }
    templatesCount: number
    lidersignUrl: string
}

function id(value: unknown): string {
    if (typeof value !== 'string' || !ID.test(value)) throw new LiderSignError(400, 'Identificador inválido')
    return value
}

export function webhookRoute() {
    const router = express.Router()
    router.post('/', express.raw({ type: '*/*', limit: '1mb' }), async (req: Request, res: Response) => {
        const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
        const item = await receive(body, req.get('x-lidersign-signature') ?? undefined)
        res.status(item.verified ? 200 : 401).json({ received: true, verified: item.verified })
    })
    return router
}

export function apiRoutes() {
    const api = express.Router()
    api.use(express.json({ limit: '100kb' }))
    api.use((req: Request, _res: Response, next: NextFunction) => {
        if (!SAFE_METHODS.has(req.method) && req.get('x-liderhub-client') !== 'web') {
            next(new LiderSignError(403, 'Requisição recusada'))
            return
        }
        next()
    })

    api.get('/status', async (_req, res) => {
        const base = {
            office: { id: config.officeId, name: config.officeName },
            lidersignUrl: config.lidersignPublicUrl,
        }
        const tenantResponse = await raw(officePath(), { tenant: false })
        if (tenantResponse.status === 404) {
            res.json({ active: false, templatesCount: 0, ...base } satisfies HostStatus)
            return
        }
        if (!tenantResponse.ok) throw new LiderSignError(502, 'O LíderSign não respondeu como esperado.')
        const tenant = (await tenantResponse.json()) as TenantDto
        if (!tenant.active) {
            res.json({ active: false, templatesCount: 0, ...base } satisfies HostStatus)
            return
        }
        const templates = await call<TemplateDto[]>('/v1/templates')
        res.json({ active: true, templatesCount: templates.length, ...base } satisfies HostStatus)
    })

    api.post('/lidersign/activate', async (_req, res) => {
        const result = await call<ConnectTenantResponse>('/v1/partner/tenants', {
            method: 'POST',
            tenant: false,
            body: {
                externalId: config.officeId,
                name: config.officeName,
                webhookUrl: config.webhookUrl,
                starterPack: true,
            },
            detail: 'Cria ou reativa a conta do escritório, com os modelos de exemplo',
        })
        rememberSecret(result.webhookSecret)
        broadcast({ type: 'status' })
        res.status(result.created ? 201 : 200).json({ created: result.created })
    })

    api.post('/lidersign/deactivate', async (_req, res) => {
        const response = await raw(officePath(), {
            method: 'DELETE',
            tenant: false,
            detail: 'Desativa a conta do escritório (os documentos ficam guardados)',
        })
        if (!response.ok && response.status !== 404)
            throw new LiderSignError(502, 'Não foi possível desativar.')
        broadcast({ type: 'status' })
        res.status(204).end()
    })

    api.get('/lidersign/open', async (req, res) => {
        const to =
            typeof req.query.to === 'string' && OFFICE_PATH.test(req.query.to) ? req.query.to : '/painel'
        res.setHeader('Cache-Control', 'no-store')
        try {
            const session = await call<OfficeSessionResponse>(`${officePath()}/sessions`, {
                method: 'POST',
                tenant: false,
                body: { to },
                detail: 'Abre o painel sem senha, com um link de uso único',
            })
            res.redirect(302, `${config.lidersignPublicUrl}${session.path}`)
        } catch {
            res.redirect(302, '/integracoes')
        }
    })

    api.get('/templates', async (_req, res) => {
        res.json(await call<TemplateDto[]>('/v1/templates'))
    })

    api.get('/contracts', async (_req, res) => {
        res.json(await call<EnvelopeDto[]>('/v1/envelopes'))
    })

    api.get('/contracts/:id', async (req, res) => {
        res.json(await call<EnvelopeDetailDto>(`/v1/envelopes/${id(req.params.id)}`))
    })

    api.post('/contracts', async (req, res) => {
        const body = (req.body ?? {}) as { contactId?: unknown; templateId?: unknown; phone?: unknown }
        const contact = CONTACTS.find((item) => item.id === body.contactId)
        if (!contact) throw new LiderSignError(404, 'Contato não encontrado')
        const phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 30) : ''
        if (phone.replace(/\D/g, '').length < 10) throw new LiderSignError(422, 'Informe o WhatsApp com DDD.')
        const template = await call<TemplateDto>(`/v1/templates/${id(body.templateId)}`)
        const envelope = await call<EnvelopeDto>('/v1/envelopes', {
            method: 'POST',
            body: {
                templateId: template.id,
                variables: fillVariables(template, contact),
                signer: { name: contact.name, cpf: contact.cpf, phone },
                externalRef: contact.externalRef,
                send: true,
            },
            detail: `Contrato "${template.name}" com os dados do contato`,
        })
        res.status(201).json(envelope)
    })

    api.get('/contracts/:id/pdf', async (req, res) => {
        const response = await raw(`/v1/envelopes/${id(req.params.id)}/files/signed`)
        if (!response.ok || !response.body) throw new LiderSignError(response.status, 'PDF indisponível')
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', 'attachment; filename="contrato-assinado.pdf"')
        res.setHeader('Cache-Control', 'no-store')
        Readable.fromWeb(response.body as ReadableStream).pipe(res)
    })

    api.get('/events', (_req, res) => subscribe(res))
    api.get('/calls', (_req, res) => res.json(listCalls()))
    api.get('/webhooks', (_req, res) => res.json(listWebhooks()))

    api.post('/reset', async (_req, res) => {
        const response = await raw('/v1/demo/reset', {
            method: 'POST',
            detail: 'Apaga o escritório de demonstração',
        })
        if (!response.ok)
            throw new LiderSignError(response.status, 'Não foi possível reiniciar a demonstração.')
        clearCalls()
        forgetWebhooks()
        broadcast({ type: 'status' })
        res.status(204).end()
    })

    api.use((_req, _res, next) => next(new LiderSignError(404, 'Rota não encontrada')))
    return api
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
    if (res.headersSent) {
        res.end()
        return
    }
    const status = error instanceof LiderSignError ? error.status : 500
    const message =
        error instanceof LiderSignError && status < 500 ? error.message : 'Algo deu errado. Tente de novo.'
    if (status >= 500) console.error(`[liderhub] ${error instanceof Error ? error.message : String(error)}`)
    res.status(status >= 500 ? 502 : status).json({ statusCode: status, message })
}
