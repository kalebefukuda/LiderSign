import { Injectable, Logger } from '@nestjs/common'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import forge from 'node-forge'
import { env } from '../config/env'

@Injectable()
export class CertificateService {
    private readonly logger = new Logger('Certificado')
    private cached: Buffer | null = null
    private pending: Promise<Buffer> | null = null

    private get path() {
        return join(resolve(env().CERT_DIR), 'seal.p12')
    }

    async getP12(): Promise<Buffer> {
        if (this.cached) return this.cached
        this.pending ??= this.load()
        this.cached = await this.pending
        return this.cached
    }

    get passphrase(): string {
        return env().SEAL_CERT_PASSPHRASE
    }

    private async load(): Promise<Buffer> {
        if (existsSync(this.path)) return readFile(this.path)
        this.logger.log('Gerando certificado de selagem de demonstração (autoassinado)')
        const p12 = this.generate()
        await mkdir(resolve(env().CERT_DIR), { recursive: true })
        await writeFile(this.path, p12, { mode: 0o600 })
        return p12
    }

    private generate(): Buffer {
        const keys = forge.pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 })
        const cert = forge.pki.createCertificate()
        cert.publicKey = keys.publicKey
        cert.serialNumber = `01${forge.util.bytesToHex(forge.random.getBytesSync(15))}`
        const now = new Date()
        cert.validity.notBefore = new Date(now.getTime() - 60_000)
        cert.validity.notAfter = new Date(now)
        cert.validity.notAfter.setFullYear(now.getFullYear() + 3)
        const attrs = [
            { name: 'commonName', value: 'LíderSign Selo (demonstração)' },
            { name: 'organizationName', value: 'LíderSign' },
            { name: 'countryName', value: 'BR' },
        ]
        cert.setSubject(attrs)
        cert.setIssuer(attrs)
        cert.setExtensions([
            { name: 'basicConstraints', cA: false },
            { name: 'keyUsage', digitalSignature: true, nonRepudiation: true },
            { name: 'subjectKeyIdentifier' },
        ])
        cert.sign(keys.privateKey, forge.md.sha256.create())
        const asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], this.passphrase, {
            algorithm: '3des',
            friendlyName: 'LiderSign Seal',
        })
        return Buffer.from(forge.asn1.toDer(asn1).getBytes(), 'binary')
    }
}
