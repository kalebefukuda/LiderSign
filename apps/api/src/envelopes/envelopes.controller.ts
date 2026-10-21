import { Body, Controller, Get, Param, Post, Query, Res, StreamableFile, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { Tenant } from '@prisma/client'
import { createEnvelopeSchema } from '@lidersign/shared'
import type { Response } from 'express'
import { CurrentTenant, TenantGuard } from '../common/partner.guard'
import { Ctx, type RequestContext } from '../common/request-context'
import { ZodPipe } from '../common/zod.pipe'
import { EnvelopesService } from './envelopes.service'

@Controller('v1/envelopes')
@UseGuards(TenantGuard)
export class EnvelopesController {
    constructor(private readonly envelopes: EnvelopesService) {}

    @Get()
    list(@CurrentTenant() tenant: Tenant, @Query('status') status?: string) {
        return this.envelopes.list(tenant, status)
    }

    @Post()
    create(
        @CurrentTenant() tenant: Tenant,
        @Body(new ZodPipe(createEnvelopeSchema)) body: ReturnType<typeof createEnvelopeSchema.parse>,
        @Ctx() ctx: RequestContext,
    ) {
        return this.envelopes.create(tenant, body, ctx)
    }

    @Get(':id')
    detail(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
        return this.envelopes.detail(tenant, id)
    }

    @Post(':id/resend')
    resend(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
        return this.envelopes.resend(tenant, id)
    }

    @Post(':id/nudge')
    @Throttle({ default: { limit: 20, ttl: 60_000 } })
    nudge(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
        return this.envelopes.nudge(tenant, id)
    }

    @Post(':id/cancel')
    cancel(@CurrentTenant() tenant: Tenant, @Param('id') id: string, @Ctx() ctx: RequestContext) {
        return this.envelopes.cancel(tenant, id, ctx)
    }

    @Get(':id/files/:kind')
    async file(
        @CurrentTenant() tenant: Tenant,
        @Param('id') id: string,
        @Param('kind') kind: string,
        @Res({ passthrough: true }) res: Response,
    ) {
        const file = await this.envelopes.file(tenant, id, kind)
        res.setHeader('Content-Type', file.type)
        res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`)
        res.setHeader('Cache-Control', 'no-store')
        return new StreamableFile(file.data)
    }
}
