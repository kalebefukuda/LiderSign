import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import {
    officeMessageSchema,
    sendContractSchema,
    type ContactDto,
    type ConversationDto,
    type OfficeMessageInput,
    type SendContractInput,
} from '@lidersign/shared'
import type { Tenant } from '@prisma/client'
import { CurrentTenant, TenantGuard } from '../common/partner.guard'
import { Ctx, type RequestContext } from '../common/request-context'
import { ZodPipe } from '../common/zod.pipe'
import { env } from '../config/env'
import { ContactsService } from './contacts.service'

@Controller('v1/contacts')
@UseGuards(TenantGuard)
export class ContactsController {
    constructor(private readonly contacts: ContactsService) {}

    @Get()
    list(@CurrentTenant() tenant: Tenant): Promise<ContactDto[]> {
        return this.contacts.list(tenant)
    }

    /** `view=client` mostra a conversa como o cliente vê (links completos), só na demonstração. */
    @Get(':id/conversation')
    conversation(
        @CurrentTenant() tenant: Tenant,
        @Param('id') id: string,
        @Query('view') view?: string,
    ): Promise<ConversationDto> {
        return this.contacts.conversation(tenant, id, view === 'client' && env().DEMO_MODE)
    }

    @Post(':id/contracts')
    @Throttle({ default: { limit: 20, ttl: 60_000 } })
    send(
        @CurrentTenant() tenant: Tenant,
        @Param('id') id: string,
        @Body(new ZodPipe(sendContractSchema)) body: SendContractInput,
        @Ctx() ctx: RequestContext,
    ) {
        return this.contacts.sendContract(tenant, id, body, ctx)
    }

    @Post(':id/messages')
    @Throttle({ default: { limit: 30, ttl: 60_000 } })
    message(
        @CurrentTenant() tenant: Tenant,
        @Param('id') id: string,
        @Body(new ZodPipe(officeMessageSchema)) body: OfficeMessageInput,
    ) {
        return this.contacts.sendOfficeMessage(tenant, id, body.text)
    }
}
