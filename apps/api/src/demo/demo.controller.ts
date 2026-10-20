import { Controller, ForbiddenException, Get, Headers, HttpCode, Post, UseGuards } from '@nestjs/common'
import { SkipThrottle } from '@nestjs/throttler'
import { env } from '../config/env'
import { toMessageDto } from '../common/mappers'
import { PartnerGuard } from '../common/partner.guard'
import { PrismaService } from '../prisma/prisma.service'
import { TenantsService } from '../tenants/tenants.service'

/** Só existe com DEMO_MODE=true: caixa do WhatsApp simulado e reset para gravar a demo de novo. */
@Controller('v1/demo')
@UseGuards(PartnerGuard)
@SkipThrottle()
export class DemoController {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tenants: TenantsService,
    ) {}

    @Get('messages')
    async messages(@Headers('x-tenant-id') externalId?: string) {
        if (!externalId) return []
        const tenant = await this.prisma.tenant.findUnique({ where: { externalId } })
        if (!tenant) return []
        const messages = await this.prisma.message.findMany({
            where: { tenantId: tenant.id },
            orderBy: { createdAt: 'desc' },
            take: 50,
        })
        return messages.reverse().map(toMessageDto)
    }

    @Post('reset')
    @HttpCode(204)
    async reset(@Headers('x-tenant-id') externalId?: string) {
        const target = externalId ?? env().DEMO_TENANT_ID
        if (target !== env().DEMO_TENANT_ID) {
            throw new ForbiddenException('O reset só vale para o escritório de demonstração')
        }
        await this.tenants.destroy(target)
    }
}
