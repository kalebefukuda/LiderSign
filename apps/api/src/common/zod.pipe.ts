import { PipeTransform } from '@nestjs/common'
import type { ZodType } from 'zod'

/** Valida e transforma o corpo com o schema do pacote compartilhado. Erros viram 422 no filtro global. */
export class ZodPipe<T> implements PipeTransform<unknown, T> {
    constructor(private readonly schema: ZodType<T>) {}

    transform(value: unknown): T {
        return this.schema.parse(value ?? {})
    }
}
