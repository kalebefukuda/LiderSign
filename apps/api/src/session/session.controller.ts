import {
    Controller,
    ForbiddenException,
    Get,
    HttpCode,
    NotFoundException,
    Post,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { SessionInfoDto } from '@lidersign/shared'
import type { Tenant } from '@prisma/client'
import type { Request, Response } from 'express'
import { CurrentTenant, TenantGuard } from '../common/partner.guard'
import { env } from '../config/env'
import { OFFICE_PROFILE } from '../contacts/contacts.data'
import { ContactsService } from '../contacts/contacts.service'
import { clearSessionCookie, CLIENT_HEADER, setSessionCookie } from '../office/session'
import { TenantsService } from '../tenants/tenants.service'
import { isLocalRequest } from './local-request'

@Controller('v1/session')
export class SessionController {
    constructor(
        private readonly tenants: TenantsService,
        private readonly contacts: ContactsService,
    ) {}

    @Get()
    info(@Req() req: Request): SessionInfoDto {
        return {
            loginAvailable: env().DEMO_MODE && isLocalRequest(req),
            officeName: OFFICE_PROFILE.nome_escritorio,
        }
    }

    /** Entra como o escritório de demonstração. Só com DEMO_MODE e só no próprio computador. */
    @Post('demo')
    @HttpCode(204)
    @Throttle({ default: { limit: 30, ttl: 60_000 } })
    async demo(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        if (!env().DEMO_MODE) throw new NotFoundException()
        if (req.headers[CLIENT_HEADER] !== 'web') throw new ForbiddenException('Requisição recusada')
        if (!isLocalRequest(req)) {
            throw new ForbiddenException(
                'A entrada de demonstração só funciona no computador onde a LíderHub está rodando.',
            )
        }
        const tenant = await this.ensureDemoTenant()
        setSessionCookie(req, res, tenant.id)
    }

    @Post('logout')
    @HttpCode(204)
    logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        clearSessionCookie(req, res)
    }

    /** Recomeça a demonstração do zero: apaga contratos e conversas e recria o escritório. */
    @Post('demo/reset')
    @HttpCode(204)
    @Throttle({ default: { limit: 20, ttl: 60_000 } })
    @UseGuards(TenantGuard)
    async reset(
        @CurrentTenant() tenant: Tenant,
        @Req() req: Request,
        @Res({ passthrough: true }) res: Response,
    ) {
        if (!env().DEMO_MODE || tenant.externalId !== env().DEMO_TENANT_ID) {
            throw new ForbiddenException('O reset só vale para o escritório de demonstração')
        }
        await this.tenants.destroy(tenant.externalId)
        const fresh = await this.ensureDemoTenant()
        setSessionCookie(req, res, fresh.id)
    }

    private async ensureDemoTenant() {
        await this.tenants.connect({
            externalId: env().DEMO_TENANT_ID,
            name: OFFICE_PROFILE.nome_escritorio,
            starterPack: true,
        })
        const tenant = await this.tenants.get(env().DEMO_TENANT_ID)
        await this.contacts.seedHistory(tenant)
        return tenant
    }
}
