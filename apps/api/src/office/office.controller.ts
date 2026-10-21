import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    NotFoundException,
    Patch,
    Post,
    Put,
    Req,
    Res,
    StreamableFile,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle } from '@nestjs/throttler'
import type { MessageStatus, OfficeMeDto, OfficeSettingsDto } from '@lidersign/shared'
import {
    isValidBrPhone,
    normalizeBrPhone,
    updateOfficeSettingsSchema,
    type UpdateOfficeSettingsInput,
} from '@lidersign/shared'
import type { Tenant } from '@prisma/client'
import type { Request, Response } from 'express'
import { toOfficeSettingsDto, toTenantDto } from '../common/mappers'
import { ZodPipe } from '../common/zod.pipe'
import { CurrentTenant, TenantGuard } from '../common/partner.guard'
import { env } from '../config/env'
import { isTunnelActive, publicUrl } from '../config/public-url'
import { MessagingService } from '../messaging/messaging.service'
import { PrismaService } from '../prisma/prisma.service'
import { StorageService } from '../storage/storage.service'
import { logoKey, logoMime, MAX_LOGO_BYTES } from './branding'
import { clearSessionCookie } from './session'

@Controller('v1/office')
export class OfficeController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly messaging: MessagingService,
        private readonly storage: StorageService,
    ) {}

    @Get('me')
    @UseGuards(TenantGuard)
    async me(@CurrentTenant() tenant: Tenant): Promise<OfficeMeDto> {
        const config = env()
        return {
            tenant: toTenantDto(tenant),
            settings: toOfficeSettingsDto(tenant),
            templatesCount: await this.prisma.template.count({ where: { tenantId: tenant.id } }),
            whatsappProvider: config.WHATSAPP_PROVIDER,
            whatsappConfigured:
                config.WHATSAPP_PROVIDER === 'cloud_api' &&
                Boolean(config.WHATSAPP_PHONE_NUMBER_ID) &&
                Boolean(config.WHATSAPP_ACCESS_TOKEN),
            webPublicUrl: publicUrl(),
            tunnel: isTunnelActive(),
            demo: config.DEMO_MODE,
            aiEnabled: Boolean(config.ANTHROPIC_API_KEY),
        }
    }

    @Patch('settings')
    @UseGuards(TenantGuard)
    async updateSettings(
        @CurrentTenant() tenant: Tenant,
        @Body(new ZodPipe(updateOfficeSettingsSchema)) body: UpdateOfficeSettingsInput,
    ): Promise<OfficeSettingsDto> {
        const updated = await this.prisma.tenant.update({ where: { id: tenant.id }, data: body })
        return toOfficeSettingsDto(updated)
    }

    @Get('logo')
    @UseGuards(TenantGuard)
    async logo(@CurrentTenant() tenant: Tenant, @Res({ passthrough: true }) res: Response) {
        if (!tenant.logoPath) throw new NotFoundException('Sem logo')
        const data = await this.storage.get(tenant.logoPath)
        res.setHeader('Content-Type', logoMime(data) ?? 'application/octet-stream')
        res.setHeader('Cache-Control', 'no-store')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        return new StreamableFile(data)
    }

    @Put('logo')
    @Throttle({ default: { limit: 10, ttl: 60_000 } })
    @UseGuards(TenantGuard)
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_LOGO_BYTES, files: 1 } }))
    async uploadLogo(
        @CurrentTenant() tenant: Tenant,
        @UploadedFile() file?: Express.Multer.File,
    ): Promise<OfficeSettingsDto> {
        if (!file?.buffer?.length) throw new BadRequestException('Envie uma imagem PNG ou JPG de até 300 KB.')
        if (!logoMime(file.buffer)) throw new BadRequestException('Use uma imagem PNG ou JPG.')
        const key = logoKey(tenant.id)
        await this.storage.put(key, file.buffer)
        const updated = await this.prisma.tenant.update({ where: { id: tenant.id }, data: { logoPath: key } })
        return toOfficeSettingsDto(updated)
    }

    @Delete('logo')
    @UseGuards(TenantGuard)
    async removeLogo(@CurrentTenant() tenant: Tenant): Promise<OfficeSettingsDto> {
        const updated = await this.prisma.tenant.update({
            where: { id: tenant.id },
            data: { logoPath: null },
        })
        return toOfficeSettingsDto(updated)
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
            body: 'Teste da LíderHub: a conexão com o WhatsApp está funcionando.',
        })
        return { status: message.status as MessageStatus, error: message.error, provider: message.provider }
    }
}
