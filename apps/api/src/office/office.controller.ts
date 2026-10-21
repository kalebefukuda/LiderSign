import {
    BadRequestException,
    Body,
    Controller,
    Get,
    HttpCode,
    Post,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common'
import type { MessageStatus, OfficeMeDto } from '@lidersign/shared'
import { isValidBrPhone, normalizeBrPhone } from '@lidersign/shared'
import type { Tenant } from '@prisma/client'
import type { Request, Response } from 'express'
import { toTenantDto } from '../common/mappers'
import { CurrentTenant, TenantGuard } from '../common/partner.guard'
import { env } from '../config/env'
import { isTunnelActive, publicUrl } from '../config/public-url'
import { MessagingService } from '../messaging/messaging.service'
import { PrismaService } from '../prisma/prisma.service'
import { clearSessionCookie } from './session'

@Controller('v1/office')
export class OfficeController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly messaging: MessagingService,
    ) {}

    @Get('me')
    @UseGuards(TenantGuard)
    async me(@CurrentTenant() tenant: Tenant): Promise<OfficeMeDto> {
        const config = env()
        return {
            tenant: toTenantDto(tenant),
            templatesCount: await this.prisma.template.count({ where: { tenantId: tenant.id } }),
            whatsappProvider: config.WHATSAPP_PROVIDER,
            whatsappConfigured:
                config.WHATSAPP_PROVIDER === 'cloud_api' &&
                Boolean(config.WHATSAPP_PHONE_NUMBER_ID) &&
                Boolean(config.WHATSAPP_ACCESS_TOKEN),
            webPublicUrl: publicUrl(),
            tunnel: isTunnelActive(),
            partner: { name: config.PARTNER_NAME, url: config.PARTNER_APP_URL ?? null },
        }
    }

    @Post('logout')
    @HttpCode(204)
    logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        clearSessionCookie(req, res)
    }

    @Post('whatsapp-test')
    @HttpCode(200)
    @UseGuards(TenantGuard)
    async whatsappTest(
        @CurrentTenant() tenant: Tenant,
        @Body() body: { phone?: unknown },
    ): Promise<{ status: MessageStatus; error: string | null; provider: string }> {
        const phone = typeof body?.phone === 'string' ? body.phone : ''
        if (!isValidBrPhone(phone)) throw new BadRequestException('Informe o celular com DDD.')
        const message = await this.messaging.send({
            tenantId: tenant.id,
            envelopeId: null,
            to: normalizeBrPhone(phone),
            kind: 'TEST',
            body: 'Teste do LíderSign: a conexão com o WhatsApp está funcionando.',
        })
        return { status: message.status as MessageStatus, error: message.error, provider: message.provider }
    }
}

@Controller('v1/public/partner')
export class PartnerInfoController {
    @Get()
    info() {
        return { name: env().PARTNER_NAME, url: env().PARTNER_APP_URL ?? null }
    }
}
