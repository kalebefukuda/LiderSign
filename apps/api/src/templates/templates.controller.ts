import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    Patch,
    Post,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import type { Tenant } from '@prisma/client'
import {
    createTemplateSchema,
    updateTemplateSchema,
    type CreateTemplateInput,
    type UpdateTemplateInput,
} from '@lidersign/shared'
import { CurrentTenant, TenantGuard } from '../common/partner.guard'
import { ZodPipe } from '../common/zod.pipe'
import { TemplateImportService } from './template-import.service'
import { TemplatesService } from './templates.service'

const MAX_UPLOAD = 5 * 1024 * 1024

@Controller('v1/templates')
@UseGuards(TenantGuard)
export class TemplatesController {
    constructor(
        private readonly templates: TemplatesService,
        private readonly importer: TemplateImportService,
    ) {}

    @Get()
    list(@CurrentTenant() tenant: Tenant) {
        return this.templates.list(tenant)
    }

    @Post()
    create(
        @CurrentTenant() tenant: Tenant,
        @Body(new ZodPipe(createTemplateSchema)) body: CreateTemplateInput,
    ) {
        return this.templates.create(tenant, body)
    }

    @Post('import')
    @HttpCode(200)
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD, files: 1 } }))
    import(@UploadedFile() file: Express.Multer.File | undefined) {
        return this.importer.import(file)
    }

    @Get(':id')
    get(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
        return this.templates.get(tenant, id)
    }

    @Patch(':id')
    update(
        @CurrentTenant() tenant: Tenant,
        @Param('id') id: string,
        @Body(new ZodPipe(updateTemplateSchema)) body: UpdateTemplateInput,
    ) {
        return this.templates.update(tenant, id, body)
    }

    @Delete(':id')
    archive(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
        return this.templates.archive(tenant, id)
    }
}
