import {
    Body,
    Controller,
    Get,
    HttpCode,
    Param,
    Post,
    Res,
    StreamableFile,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Throttle } from '@nestjs/throttler'
import { completeSigningSchema, verifyOtpSchema, type CompleteSigningInput } from '@lidersign/shared'
import type { Response } from 'express'
import { Ctx, type RequestContext } from '../common/request-context'
import { ZodPipe } from '../common/zod.pipe'
import { SigningService } from './signing.service'

/** Rotas públicas do signatário. Limite por IP mais apertado que o geral. */
@Controller('v1/sign/:token')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class SigningController {
    constructor(private readonly signing: SigningService) {}

    @Get()
    session(@Param('token') token: string, @Ctx() ctx: RequestContext) {
        return this.signing.session(token, ctx)
    }

    @Get('document')
    async document(@Param('token') token: string, @Res({ passthrough: true }) res: Response) {
        const data = await this.signing.document(token)
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', 'inline; filename="documento.pdf"')
        res.setHeader('Cache-Control', 'no-store')
        return new StreamableFile(data)
    }

    @Post('otp')
    @HttpCode(200)
    sendOtp(@Param('token') token: string, @Ctx() ctx: RequestContext) {
        return this.signing.sendOtp(token, ctx)
    }

    @Post('otp/verify')
    @HttpCode(200)
    verifyOtp(
        @Param('token') token: string,
        @Body(new ZodPipe(verifyOtpSchema)) body: { code: string },
        @Ctx() ctx: RequestContext,
    ) {
        return this.signing.verifyOtp(token, body.code, ctx)
    }

    @Post('selfie')
    @HttpCode(200)
    @UseInterceptors(FileInterceptor('selfie', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
    selfie(
        @Param('token') token: string,
        @UploadedFile() file: Express.Multer.File | undefined,
        @Ctx() ctx: RequestContext,
    ) {
        return this.signing.selfie(token, file, ctx)
    }

    @Post('complete')
    @HttpCode(200)
    complete(
        @Param('token') token: string,
        @Body(new ZodPipe(completeSigningSchema)) body: CompleteSigningInput,
        @Ctx() ctx: RequestContext,
    ) {
        return this.signing.complete(token, body, ctx)
    }

    @Get('signed')
    async signed(@Param('token') token: string, @Res({ passthrough: true }) res: Response) {
        const file = await this.signing.signedCopy(token)
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`)
        res.setHeader('Cache-Control', 'no-store')
        return new StreamableFile(file.data)
    }
}
