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
import { CLIENT_HEADER, readSession } from '../office/session'
import { safeEqual } from './crypto'

export type TenantRequest = Request & { tenant?: Tenant }

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

function assertPartner(req: Request) {
    const header = req.headers.authorization ?? ''
    const [scheme, token] = header.split(' ')
    if (scheme?.toLowerCase() !== 'bearer' || !token || !safeEqual(token, env().PARTNER_API_KEY)) {
        throw new UnauthorizedException('Chave de parceiro inválida')
    }
}

@Injectable()
export class PartnerGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        assertPartner(context.switchToHttp().getRequest<Request>())
        return true
    }
}

@Injectable()
export class TenantGuard implements CanActivate {
    constructor(private readonly prisma: PrismaService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest<TenantRequest>()
        const tenant = req.headers.authorization ? await this.fromPartner(req) : await this.fromSession(req)
        if (!tenant.active)
            throw new ForbiddenException('Módulo de contratos desativado para este escritório')
        req.tenant = tenant
        return true
    }

    private async fromPartner(req: Request): Promise<Tenant> {
        assertPartner(req)
        const externalId = req.headers['x-tenant-id']
        if (typeof externalId !== 'string' || externalId.trim() === '') {
            throw new UnauthorizedException('Informe o cabeçalho X-Tenant-Id')
        }
        const tenant = await this.prisma.tenant.findUnique({ where: { externalId: externalId.trim() } })
        if (!tenant) throw new NotFoundException('Escritório não encontrado')
        return tenant
    }

    private async fromSession(req: Request): Promise<Tenant> {
        const tenantId = readSession(req)
        if (!tenantId) throw new UnauthorizedException('Sessão expirada. Entre de novo.')
        if (!SAFE_METHODS.has(req.method) && req.headers[CLIENT_HEADER] !== 'web') {
            throw new ForbiddenException('Requisição recusada')
        }
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } })
        if (!tenant) throw new UnauthorizedException('Sessão expirada. Entre de novo.')
        return tenant
    }
}

export const CurrentTenant = createParamDecorator((_: unknown, context: ExecutionContext): Tenant => {
    const tenant = context.switchToHttp().getRequest<TenantRequest>().tenant
    if (!tenant) throw new UnauthorizedException('Escritório não identificado')
    return tenant
})
