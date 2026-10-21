import { Body, Controller, Delete, Get, HttpCode, Param, Post, Res, UseGuards } from '@nestjs/common'
import { connectTenantSchema, type ConnectTenantInput } from '@lidersign/shared'
import type { Response } from 'express'
import { toTenantDto } from '../common/mappers'
import { PartnerGuard } from '../common/partner.guard'
import { ZodPipe } from '../common/zod.pipe'
import { TenantsService } from './tenants.service'

@Controller('v1/partner/tenants')
@UseGuards(PartnerGuard)
export class TenantsController {
    constructor(private readonly tenants: TenantsService) {}

    @Post()
    async connect(
        @Body(new ZodPipe(connectTenantSchema)) body: ConnectTenantInput,
        @Res({ passthrough: true }) res: Response,
    ) {
        const result = await this.tenants.connect(body)
        res.status(result.created ? 201 : 200)
        return result
    }

    @Get(':externalId')
    async get(@Param('externalId') externalId: string) {
        return toTenantDto(await this.tenants.get(externalId))
    }

    @Get(':externalId/webhook-secret')
    async webhookSecret(@Param('externalId') externalId: string) {
        const tenant = await this.tenants.get(externalId)
        return { webhookSecret: tenant.webhookSecret }
    }

    @Delete(':externalId')
    @HttpCode(204)
    async deactivate(@Param('externalId') externalId: string) {
        await this.tenants.deactivate(externalId)
    }
}
