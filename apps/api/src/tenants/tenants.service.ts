import { Injectable, NotFoundException } from '@nestjs/common'
import type { ConnectTenantInput, ConnectTenantResponse } from '@lidersign/shared'
import { randomHex } from '../common/crypto'
import { toTenantDto } from '../common/mappers'
import { PrismaService } from '../prisma/prisma.service'
import { StorageService } from '../storage/storage.service'
import { TemplatesService } from '../templates/templates.service'
import { STARTER_TEMPLATES } from './starter-pack'

@Injectable()
export class TenantsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly templates: TemplatesService,
        private readonly storage: StorageService,
    ) {}

    /** "Ativar LíderSign": idempotente. Cria ou reativa o escritório e, se pedido, os modelos de exemplo. */
    async connect(input: ConnectTenantInput): Promise<ConnectTenantResponse> {
        const existing = await this.prisma.tenant.findUnique({ where: { externalId: input.externalId } })
        let webhookSecret: string | undefined
        const tenant = existing
            ? await this.prisma.tenant.update({
                  where: { id: existing.id },
                  data: {
                      name: input.name,
                      active: true,
                      webhookUrl: input.webhookUrl ?? existing.webhookUrl,
                  },
              })
            : await this.prisma.tenant.create({
                  data: {
                      externalId: input.externalId,
                      name: input.name,
                      webhookUrl: input.webhookUrl ?? null,
                      webhookSecret: (webhookSecret = randomHex(32)),
                  },
              })

        if (input.starterPack) {
            const count = await this.prisma.template.count({ where: { tenantId: tenant.id } })
            if (count === 0) {
                for (const template of STARTER_TEMPLATES) await this.templates.create(tenant, template)
            }
        }
        return {
            tenant: toTenantDto(tenant),
            created: !existing,
            ...(webhookSecret ? { webhookSecret } : {}),
        }
    }

    async get(externalId: string) {
        const tenant = await this.prisma.tenant.findUnique({ where: { externalId } })
        if (!tenant) throw new NotFoundException('Escritório não encontrado')
        return tenant
    }

    async deactivate(externalId: string) {
        const tenant = await this.get(externalId)
        await this.prisma.tenant.update({ where: { id: tenant.id }, data: { active: false } })
    }

    /** Apaga o escritório, os registros (cascade) e os arquivos. Usado só pelo reset da demo. */
    async destroy(externalId: string) {
        const tenant = await this.prisma.tenant.findUnique({ where: { externalId } })
        if (!tenant) return
        await this.prisma.tenant.delete({ where: { id: tenant.id } })
        await this.storage.removePrefix(tenant.id)
    }
}
