import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    HttpCode,
    Logger,
    NotFoundException,
    Param,
    Post,
    Query,
    Req,
    Res,
    StreamableFile,
    UseGuards,
} from '@nestjs/common'
import { SkipThrottle, Throttle } from '@nestjs/throttler'
import { simulatorInboundSchema, type SimulatorInboundInput } from '@lidersign/shared'
import type { Tenant } from '@prisma/client'
import type { Request, Response } from 'express'
import { CurrentTenant, TenantGuard } from '../common/partner.guard'
import { ZodPipe } from '../common/zod.pipe'
import { env } from '../config/env'
import { ContactsService } from '../contacts/contacts.service'
import { verifyMediaSignature } from '../messaging/messaging.service'
import { PrismaService } from '../prisma/prisma.service'
import { StorageService } from '../storage/storage.service'
import { ConversationService, type Inbound } from './conversation.service'
import { downloadMetaMedia, metaMessages, verifyMetaSignature, type MetaWebhookPayload } from './meta'

type RawRequest = Request & { rawBody?: Buffer }

@Controller('v1/whatsapp')
export class WhatsAppController {
    private readonly logger = new Logger('WhatsApp')

    constructor(
        private readonly conversation: ConversationService,
        private readonly contacts: ContactsService,
        private readonly prisma: PrismaService,
        private readonly storage: StorageService,
    ) {}

    /** Celular simulado da demonstração: a mensagem entra pelo mesmo caminho do webhook da Meta. */
    @Post('simulator')
    @HttpCode(202)
    @Throttle({ default: { limit: 60, ttl: 60_000 } })
    @UseGuards(TenantGuard)
    async simulator(
        @CurrentTenant() tenant: Tenant,
        @Body(new ZodPipe(simulatorInboundSchema)) body: SimulatorInboundInput,
    ) {
        // Fora da demonstração, ninguém do escritório pode "tocar" pelo cliente
        if (!env().DEMO_MODE) {
            throw new ForbiddenException('O celular simulado só existe no modo demonstração')
        }
        const contact = this.contacts.find(body.contactId)
        const phones = await this.contacts.phones(tenant, contact)
        const active = (
            await Promise.all(phones.map((phone) => this.conversation.findActive(tenant.id, phone)))
        )
            .filter((item) => item !== null)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
        const phone = active?.signerPhone ?? contact.phone
        const input: Inbound =
            body.type === 'text'
                ? { type: 'text', text: body.text }
                : body.type === 'button'
                  ? { type: 'button', buttonId: body.buttonId }
                  : {
                        type: 'image',
                        data: Buffer.from(body.imageDataUrl.split(',')[1] ?? '', 'base64'),
                        caption: 'Selfie',
                    }
        const result = await this.conversation.handleInbound(tenant.id, phone, input, {
            provider: 'simulator',
        })
        return { accepted: true, handled: result.handled }
    }

    /** Verificação do webhook na Meta (hub.challenge). */
    @Get('webhook')
    @SkipThrottle()
    verify(
        @Query('hub.mode') mode: string | undefined,
        @Query('hub.verify_token') token: string | undefined,
        @Query('hub.challenge') challenge: string | undefined,
        @Res() res: Response,
    ) {
        const expected = env().WHATSAPP_VERIFY_TOKEN
        if (!expected || mode !== 'subscribe' || token !== expected || !challenge) {
            res.status(403).send('Forbidden')
            return
        }
        res.type('text/plain').send(challenge.slice(0, 200))
    }

    /** Mensagens dos clientes no WhatsApp oficial. Responde 200 na hora e processa em seguida. */
    @Post('webhook')
    @HttpCode(200)
    @SkipThrottle()
    receive(@Req() req: RawRequest) {
        if (!env().WHATSAPP_APP_SECRET) throw new NotFoundException()
        if (!verifyMetaSignature(req.rawBody, req.get('x-hub-signature-256') ?? undefined)) {
            throw new ForbiddenException('Assinatura inválida')
        }
        const messages = metaMessages(req.body as MetaWebhookPayload)
        void this.process(messages).catch((error: Error) =>
            this.logger.error(`Falha ao tratar mensagem da Meta: ${error.message}`),
        )
        return { received: true }
    }

    private async process(messages: ReturnType<typeof metaMessages>) {
        for (const message of messages) {
            let input: Inbound | null = null
            if (message.type === 'text' && message.text?.body) {
                input = { type: 'text', text: message.text.body.slice(0, 2_000) }
            } else if (message.type === 'interactive' && message.interactive?.button_reply?.id) {
                input = {
                    type: 'button',
                    buttonId: message.interactive.button_reply.id,
                    title: message.interactive.button_reply.title,
                }
            } else if (message.type === 'button' && message.button?.payload) {
                input = { type: 'button', buttonId: message.button.payload, title: message.button.text }
            } else if (message.type === 'image' && message.image?.id) {
                const data = await downloadMetaMedia(message.image.id)
                if (data) input = { type: 'image', data, caption: message.image.caption ?? null }
            }
            if (!input) continue
            await this.conversation.handleInbound(null, message.from, input, {
                provider: 'cloud_api',
                providerMessageId: message.id,
            })
        }
    }

    /** PDF enviado na conversa. A Meta baixa por este link assinado e com prazo. */
    @Get('media/:id')
    @Throttle({ default: { limit: 60, ttl: 60_000 } })
    async media(
        @Param('id') id: string,
        @Query('exp') exp: string | undefined,
        @Query('sig') sig: string | undefined,
        @Res({ passthrough: true }) res: Response,
    ) {
        if (!exp || !sig || !verifyMediaSignature(id, exp, sig)) throw new NotFoundException()
        const message = await this.prisma.message.findUnique({ where: { id }, include: { envelope: true } })
        const payload = message?.payload as { document?: { filename?: string; file?: string } } | null
        const envelope = message?.envelope
        if (!message || message.type !== 'DOCUMENT' || !envelope || !payload?.document) {
            throw new NotFoundException()
        }
        const path = payload.document.file === 'signed' ? envelope.signedPath : envelope.originalPath
        if (!path) throw new NotFoundException()
        const filename = (payload.document.filename ?? 'documento.pdf').replace(/[^\p{L}\p{N} ._-]/gu, '')
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader(
            'Content-Disposition',
            `inline; filename="documento.pdf"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        )
        res.setHeader('Cache-Control', 'private, no-store')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        return new StreamableFile(await this.storage.get(path))
    }
}
