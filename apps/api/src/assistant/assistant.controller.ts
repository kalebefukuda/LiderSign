import { Body, Controller, HttpCode, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle } from '@nestjs/throttler'
import { assistantMessageSchema, type AssistantMessageInput, type AssistantReply } from '@lidersign/shared'
import type { Tenant } from '@prisma/client'
import { CurrentTenant, TenantGuard } from '../common/partner.guard'
import { ZodPipe } from '../common/zod.pipe'
import { AssistantService } from './assistant.service'

const MAX_UPLOAD = 5 * 1024 * 1024

@Controller('v1/assistant')
@UseGuards(TenantGuard)
export class AssistantController {
    constructor(private readonly assistant: AssistantService) {}

    @Post()
    @HttpCode(200)
    @Throttle({ default: { limit: 20, ttl: 60_000 } })
    reply(
        @CurrentTenant() tenant: Tenant,
        @Body(new ZodPipe(assistantMessageSchema)) body: AssistantMessageInput,
    ): Promise<AssistantReply> {
        return this.assistant.reply(tenant, body)
    }

    @Post('template')
    @HttpCode(200)
    @Throttle({ default: { limit: 5, ttl: 60_000 } })
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD, files: 1 } }))
    template(
        @CurrentTenant() tenant: Tenant,
        @UploadedFile() file: Express.Multer.File | undefined,
    ): Promise<AssistantReply> {
        return this.assistant.createTemplate(tenant, file)
    }
}
