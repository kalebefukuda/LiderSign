import { Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma, Tenant } from '@prisma/client'
import {
    extractVariableKeys,
    humanizeKey,
    type CreateTemplateInput,
    type TemplateVariable,
    type UpdateTemplateInput,
} from '@lidersign/shared'
import { toTemplateDto } from '../common/mappers'
import { PrismaService } from '../prisma/prisma.service'

/** Mantém variables em sincronia com o corpo: cria as que faltam, descarta as que não são usadas. */
export function syncVariables(body: string, variables: TemplateVariable[]): TemplateVariable[] {
    const keys = extractVariableKeys(body)
    return keys.map(
        (key) => variables.find((variable) => variable.key === key) ?? { key, label: humanizeKey(key), type: 'text' },
    )
}

@Injectable()
export class TemplatesService {
    constructor(private readonly prisma: PrismaService) {}

    async list(tenant: Tenant) {
        const templates = await this.prisma.template.findMany({
            where: { tenantId: tenant.id, archived: false },
            orderBy: { createdAt: 'asc' },
        })
        return templates.map(toTemplateDto)
    }

    async findOwned(tenant: Tenant, id: string) {
        const template = await this.prisma.template.findFirst({ where: { id, tenantId: tenant.id } })
        if (!template) throw new NotFoundException('Modelo não encontrado')
        return template
    }

    async get(tenant: Tenant, id: string) {
        return toTemplateDto(await this.findOwned(tenant, id))
    }

    async create(tenant: Tenant, input: CreateTemplateInput) {
        const template = await this.prisma.template.create({
            data: {
                tenantId: tenant.id,
                name: input.name,
                kind: input.kind,
                assuranceLevel: input.assuranceLevel,
                body: input.body,
                variables: syncVariables(input.body, input.variables) as unknown as Prisma.InputJsonValue,
            },
        })
        return toTemplateDto(template)
    }

    async update(tenant: Tenant, id: string, input: UpdateTemplateInput) {
        const current = await this.findOwned(tenant, id)
        if (current.archived) throw new NotFoundException('Modelo arquivado')
        const body = input.body ?? current.body
        const variables = input.variables ?? (current.variables as TemplateVariable[])
        const template = await this.prisma.template.update({
            where: { id },
            data: {
                name: input.name ?? undefined,
                kind: input.kind ?? undefined,
                assuranceLevel: input.assuranceLevel ?? undefined,
                body,
                variables: syncVariables(body, variables) as unknown as Prisma.InputJsonValue,
                version: { increment: 1 },
            },
        })
        return toTemplateDto(template)
    }

    async archive(tenant: Tenant, id: string) {
        await this.findOwned(tenant, id)
        const template = await this.prisma.template.update({ where: { id }, data: { archived: true } })
        return toTemplateDto(template)
    }
}
