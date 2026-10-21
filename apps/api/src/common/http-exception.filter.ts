import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { ApiErrorDto } from '@lidersign/shared'
import type { Response } from 'express'
import { ZodError } from 'zod'

const REASON: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    410: 'Gone',
    413: 'Payload Too Large',
    415: 'Unsupported Media Type',
    422: 'Unprocessable Entity',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger('Erro')

    catch(exception: unknown, host: ArgumentsHost) {
        const res = host.switchToHttp().getResponse<Response>()
        if (res.headersSent) return

        let body: ApiErrorDto
        if (exception instanceof ZodError) {
            body = {
                statusCode: 422,
                error: REASON[422],
                message: 'Dados inválidos',
                issues: exception.issues.map((issue) => ({
                    path: issue.path.join('.'),
                    message: issue.message,
                })),
            }
        } else if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2025') {
            body = { statusCode: 404, error: REASON[404], message: 'Registro não encontrado' }
        } else if (exception instanceof HttpException) {
            const status = exception.getStatus()
            const response = exception.getResponse()
            let message = exception.message
            let issues: ApiErrorDto['issues']
            if (typeof response === 'object' && response !== null) {
                const r = response as { message?: unknown; issues?: ApiErrorDto['issues'] }
                if (typeof r.message === 'string') message = r.message
                else if (Array.isArray(r.message)) message = r.message.join('; ')
                issues = r.issues
            }
            if (status === 429 && message === 'ThrottlerException: Too Many Requests') {
                message = 'Muitas tentativas. Aguarde um minuto e tente de novo.'
            }
            body = {
                statusCode: status,
                error: REASON[status] ?? 'Error',
                message,
                ...(issues ? { issues } : {}),
            }
        } else {
            this.logger.error(exception instanceof Error ? exception.stack : String(exception))
            body = {
                statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
                error: REASON[500],
                message: 'Erro interno. Tente de novo em instantes.',
            }
        }
        res.status(body.statusCode).json(body)
    }
}
