import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    HttpCode,
    Param,
    Post,
    Res,
    UseGuards,
} from '@nestjs/common'
import {
    connectTenantSchema,
    createOfficeSessionSchema,
    type ConnectTenantInput,
    type CreateOfficeSessionInput,
    type OfficeSessionResponse,
} from '@lidersign/shared'
import type { Response } from 'express'
import { toTenantDto } from '../common/mappers'
import { PartnerGuard } from '../common/partner.guard'
import { ZodPipe } from '../common/zod.pipe'
import { issueLoginToken } from '../office/session'
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

    @Post(':externalId/sessions')
    @HttpCode(201)
    async session(
        @Param('externalId') externalId: string,
        @Body(new ZodPipe(createOfficeSessionSchema)) body: CreateOfficeSessionInput,
    ): Promise<OfficeSessionResponse> {
        const tenant = await this.tenants.get(externalId)
        if (!tenant.active) throw new ForbiddenException('LíderSign desativado para este escritório')
        const { token, expiresAt } = issueLoginToken(tenant.id)
        return {
            path: `/entrar?token=${token}&to=${encodeURIComponent(body.to)}`,
            expiresAt: expiresAt.toISOString(),
        }
    }

    @Delete(':externalId')
    @HttpCode(204)
    async deactivate(@Param('externalId') externalId: string) {
        await this.tenants.deactivate(externalId)
    }
}
