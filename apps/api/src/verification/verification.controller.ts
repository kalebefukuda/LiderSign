import { Controller, Get, HttpCode, Param, Post, UploadedFile, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle } from '@nestjs/throttler'
import { VerificationService } from './verification.service'

@Controller('v1/public/verify')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class VerificationController {
    constructor(private readonly verification: VerificationService) {}

    @Post('file')
    @HttpCode(200)
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024, files: 1 } }))
    byFile(@UploadedFile() file: Express.Multer.File | undefined) {
        return this.verification.byFile(file)
    }

    @Get(':code')
    byCode(@Param('code') code: string) {
        return this.verification.byCode(code)
    }
}
