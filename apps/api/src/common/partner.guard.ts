import {
    CanActivate,
    createParamDecorator,
    ExecutionContext,
    ForbiddenException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common'
import type { Tenant } from '@prisma/client'
import type { Request } from 'express'
import { env } from '../config/env'
import { PrismaService } from '../prisma/prisma.service'
import { safeEqual } from './crypto'

export type TenantRequest = Request & { tenant?: Tenant }

function assertPartner(req: Request) {
    const header = req.headers.authorization ?? ''
    const [scheme, token] = header.split(' ')
    if (scheme?.toLowerCase() !== 'bearer' || !token || !safeEqual(token, env().PARTNER_API_KEY)) {
        throw new UnauthorizedException('Chave de parceiro inválida')
    }
}

/** Só a LíderHub (chave de parceiro). Usado nas rotas /v1/partner. */
@Injectable()
export class PartnerGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        assertPartner(context.switchToHttp().getRequest<Request>())
        return true
    }
}

/** Chave de parceiro + X-Tenant-Id de um escritório ativo. O escritório nunca vê token. */
@Injectable()
export class TenantGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest<TenantRequest>()
        assertPartner(req)
        const externalId = req.headers['x-tenant-id']
        if (typeof externalId !== 'string' || externalId.trim() === '') {
            throw new UnauthorizedException('Informe o cabeçalho X-Tenant-Id')
        }
        const tenant = await this.prisma.tenant.findUnique({ where: { externalId: externalId.trim() } })
        if (!tenant) throw new NotFoundException('Escritório não encontrado. Ative o LíderSign primeiro.')
        if (!tenant.active) throw new ForbiddenException('LíderSign desativado para este escritório')
        req.tenant = tenant
        return true
    }
}

export const CurrentTenant = createParamDecorator((_: unknown, context: ExecutionContext): Tenant => {
    const tenant = context.switchToHttp().getRequest<TenantRequest>().tenant
    if (!tenant) throw new UnauthorizedException('Escritório não identificado')
    return tenant
})
