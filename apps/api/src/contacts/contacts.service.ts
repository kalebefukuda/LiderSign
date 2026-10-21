import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import {
    maskCpf,
    maskPhone,
    onlyDigits,
    type ContactDto,
    type ConversationDto,
    type SendContractInput,
    type TemplateVariable,
} from '@lidersign/shared'
import type { Envelope, Message, Tenant } from '@prisma/client'
import { toEnvelopeDto, toMessageDto } from '../common/mappers'
import { env } from '../config/env'
import type { RequestContext } from '../common/request-context'
import { EnvelopesService } from '../envelopes/envelopes.service'
import { EventsService } from '../events/events.service'
import { MessagingService, signMediaPath } from '../messaging/messaging.service'
import { PrismaService } from '../prisma/prisma.service'
import { TemplatesService } from '../templates/templates.service'
import { CONTACTS, contactRef, fillVariables, findContact, initials, type DemoContact } from './contacts.data'

const OPEN = ['SENT', 'VIEWED']

@Injectable()
export class ContactsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly templates: TemplatesService,
        private readonly envelopes: EnvelopesService,
        private readonly messaging: MessagingService,
        private readonly events: EventsService,
    ) {}

    find(id: string): DemoContact {
        const contact = findContact(id)
        if (!contact) throw new NotFoundException('Contato não encontrado')
        return contact
    }

    private latestEnvelope(tenant: Tenant, contact: DemoContact) {
        return this.prisma.envelope.findFirst({
            where: { tenantId: tenant.id, externalRef: contactRef(contact.id), status: { not: 'CANCELED' } },
            orderBy: { createdAt: 'desc' },
        })
    }

    /** Todos os números usados com o contato (o da ficha e os informados nos envios). */
    async phones(tenant: Tenant, contact: DemoContact) {
        const envelopes = await this.prisma.envelope.findMany({
            where: { tenantId: tenant.id, externalRef: contactRef(contact.id) },
            select: { signerPhone: true },
        })
        return [...new Set([contact.phone, ...envelopes.map((item) => item.signerPhone)])]
    }

    private toDto(contact: DemoContact, envelope: Envelope | null, last: Message | null): ContactDto {
        const stage = !envelope
            ? contact.stage
            : envelope.status === 'SIGNED' || envelope.status === 'COMPLETED'
              ? 'Fechado'
              : OPEN.includes(envelope.status)
                ? 'Contrato enviado'
                : contact.stage
        return {
            id: contact.id,
            name: contact.name,
            initials: initials(contact.name),
            cpfMasked: maskCpf(contact.cpf),
            phoneMasked: maskPhone(envelope?.signerPhone ?? contact.phone),
            city: contact.city,
            topic: contact.topic,
            stage,
            lastMessage: last
                ? {
                      body: last.body.slice(0, 140),
                      direction: last.direction === 'IN' ? 'IN' : 'OUT',
                      createdAt: last.createdAt.toISOString(),
                  }
                : null,
            contract: envelope ? toEnvelopeDto(envelope) : null,
        }
    }

    async describe(tenant: Tenant, contact: DemoContact): Promise<ContactDto> {
        const phones = await this.phones(tenant, contact)
        const [envelope, last] = await Promise.all([
            this.latestEnvelope(tenant, contact),
            this.prisma.message.findFirst({
                where: { tenantId: tenant.id, to: { in: phones }, kind: { not: 'TEST' } },
                orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            }),
        ])
        return this.toDto(contact, envelope, last)
    }

    async list(tenant: Tenant): Promise<ContactDto[]> {
        const items = await Promise.all(CONTACTS.map((contact) => this.describe(tenant, contact)))
        return items.sort((a, b) =>
            (b.lastMessage?.createdAt ?? '').localeCompare(a.lastMessage?.createdAt ?? ''),
        )
    }

    async conversation(tenant: Tenant, id: string, reveal: boolean): Promise<ConversationDto> {
        const contact = this.find(id)
        const phones = await this.phones(tenant, contact)
        const rows = await this.prisma.message.findMany({
            where: { tenantId: tenant.id, to: { in: phones }, kind: { not: 'TEST' } },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 300,
        })
        const messages = rows.reverse().map((row) => {
            const dto = toMessageDto(row)
            const withMedia = dto.type === 'DOCUMENT' ? { ...dto, url: signMediaPath(dto.id) } : dto
            return reveal && dto.type !== 'DOCUMENT' ? this.messaging.revealForDemo(withMedia) : withMedia
        })
        return { contact: await this.describe(tenant, contact), messages }
    }

    async sendContract(tenant: Tenant, id: string, input: SendContractInput, ctx: RequestContext) {
        const contact = this.find(id)
        const open = await this.prisma.envelope.findFirst({
            where: { tenantId: tenant.id, externalRef: contactRef(contact.id), status: { in: OPEN } },
        })
        if (open) {
            throw new ConflictException('Este contato já tem um contrato aguardando assinatura.')
        }
        const template = await this.templates.findOwned(tenant, input.templateId)
        return this.envelopes.create(
            tenant,
            {
                templateId: template.id,
                variables: fillVariables((template.variables ?? []) as TemplateVariable[], contact),
                // Na demonstração dá para testar com o próprio número; em produção vale o número do CRM
                signer: {
                    name: contact.name,
                    cpf: onlyDigits(contact.cpf),
                    phone: (env().DEMO_MODE ? input.phone : undefined) ?? contact.phone,
                },
                externalRef: contactRef(contact.id),
                send: true,
                channel: input.channel ?? 'WHATSAPP',
            },
            ctx,
        )
    }

    /** Mensagem escrita pela equipe do escritório na conversa. */
    async sendOfficeMessage(tenant: Tenant, id: string, text: string) {
        const contact = this.find(id)
        const envelope = await this.latestEnvelope(tenant, contact)
        const message = await this.messaging.send({
            tenantId: tenant.id,
            envelopeId: envelope && OPEN.includes(envelope.status) ? envelope.id : null,
            to: envelope?.signerPhone ?? contact.phone,
            kind: 'CONVERSATION',
            body: text,
            payload: { author: 'team' },
        })
        return toMessageDto(message)
    }

    /** Conversa anterior ao contrato (o que o agente de IA de atendimento já falou com o lead). */
    async seedHistory(tenant: Tenant) {
        const now = Date.now()
        for (const contact of CONTACTS) {
            const exists = await this.prisma.message.count({
                where: { tenantId: tenant.id, to: contact.phone },
            })
            if (exists) continue
            await this.prisma.message.createMany({
                data: contact.history.map((line) => ({
                    tenantId: tenant.id,
                    envelopeId: null,
                    to: contact.phone,
                    direction: line.from === 'lead' ? 'IN' : 'OUT',
                    type: 'TEXT',
                    kind: line.from === 'lead' ? 'INBOUND' : 'CONVERSATION',
                    body: line.text,
                    payload: line.from === 'agent' ? { author: 'agent' } : undefined,
                    provider: 'simulator',
                    status: line.from === 'lead' ? 'RECEIVED' : 'SIMULATED',
                    createdAt: new Date(now - line.minutesAgo * 60_000),
                })),
            })
        }
        this.events.emit(tenant.id, { type: 'contacts.updated' })
    }
}
