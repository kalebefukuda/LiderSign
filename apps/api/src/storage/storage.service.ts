import { Injectable } from '@nestjs/common'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, normalize, resolve, sep } from 'node:path'
import { env } from '../config/env'

export interface FileStorage {
    put(key: string, data: Buffer): Promise<void>
    get(key: string): Promise<Buffer>
    removePrefix(prefix: string): Promise<void>
}

@Injectable()
export class StorageService implements FileStorage {
    private readonly root = resolve(env().STORAGE_DIR)

    // Impede path traversal
    private pathFor(key: string): string {
        const full = resolve(this.root, normalize(key))
        if (full !== this.root && !full.startsWith(this.root + sep)) {
            throw new Error('Chave de arquivo inválida')
        }
        return full
    }

    async put(key: string, data: Buffer): Promise<void> {
        const full = this.pathFor(key)
        await mkdir(dirname(full), { recursive: true })
        await writeFile(full, data)
    }

    async get(key: string): Promise<Buffer> {
        return readFile(this.pathFor(key))
    }

    async removePrefix(prefix: string): Promise<void> {
        await rm(this.pathFor(prefix), { recursive: true, force: true })
    }

    static envelopeKey(tenantId: string, envelopeId: string, file: string): string {
        return join(tenantId, envelopeId, file)
    }
}
