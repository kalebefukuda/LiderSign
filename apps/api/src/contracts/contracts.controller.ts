import { Controller, Get, Post, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { maskName, type ImportedContractDto } from '@lidersign/shared'
import type { Tenant } from '@prisma/client'
import { CurrentTenant, TenantGuard } from '../common/partner.guard'
import { EnvelopesService } from '../envelopes/envelopes.service'
import { importedContracts } from './imported'

@Controller('v1/contracts')
@UseGuards(TenantGuard)
export class ContractsController {
    constructor(private readonly envelopes: EnvelopesService) {}

    /** Histórico importado do ZapSign (simulado na demonstração), para comparar o funil. */
    @Get('imported')
    imported(@CurrentTenant() tenant: Tenant): ImportedContractDto[] {
        return importedContracts(tenant.id)
    }

    /** Lembra de uma vez todo mundo que está parado sem assinar. */
    @Post('nudge-stalled')
    @Throttle({ default: { limit: 6, ttl: 60_000 } })
    async nudgeStalled(@CurrentTenant() tenant: Tenant) {
        const nudged = await this.envelopes.nudgeStalled(tenant)
        return { count: nudged.length, names: nudged.map((item) => maskName(item.signerName)) }
    }
}
