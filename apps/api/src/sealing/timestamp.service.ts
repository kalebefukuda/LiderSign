import { Injectable } from '@nestjs/common'
import { randomBytes } from 'node:crypto'
import forge from 'node-forge'
import { env } from '../config/env'

const OID_SHA256 = '2.16.840.1.101.3.4.2.1'

export type TimestampResult =
    | { status: 'OK'; token: Buffer; genTime: Date; tsa: string }
    | { status: 'FAILED'; error: string; tsa: string }
    | { status: 'SKIPPED' }

const { asn1 } = forge
const U = asn1.Class.UNIVERSAL

@Injectable()
export class TimestampService {
    get enabled(): boolean {
        return Boolean(env().TSA_URL)
    }

    static buildRequest(sha256Hex: string): Buffer {
        const nonce = randomBytes(8)
        nonce[0] &= 0x7f
        const request = asn1.create(U, asn1.Type.SEQUENCE, true, [
            asn1.create(U, asn1.Type.INTEGER, false, asn1.integerToDer(1).getBytes()),
            asn1.create(U, asn1.Type.SEQUENCE, true, [
                asn1.create(U, asn1.Type.SEQUENCE, true, [
                    asn1.create(U, asn1.Type.OID, false, asn1.oidToDer(OID_SHA256).getBytes()),
                    asn1.create(U, asn1.Type.NULL, false, ''),
                ]),
                asn1.create(
                    U,
                    asn1.Type.OCTETSTRING,
                    false,
                    Buffer.from(sha256Hex, 'hex').toString('binary'),
                ),
            ]),
            asn1.create(U, asn1.Type.INTEGER, false, nonce.toString('binary')),
            asn1.create(U, asn1.Type.BOOLEAN, false, String.fromCharCode(0xff)),
        ])
        return Buffer.from(asn1.toDer(request).getBytes(), 'binary')
    }

    static parseResponse(der: Buffer, expectedSha256Hex: string): { genTime: Date } {
        const response = asn1.fromDer(der.toString('binary'))
        const parts = response.value as forge.asn1.Asn1[]
        const statusInfo = parts[0].value as forge.asn1.Asn1[]
        const status = Number.parseInt(forge.util.bytesToHex(statusInfo[0].value as string), 16)
        if (status !== 0 && status !== 1) throw new Error(`ACT recusou o pedido (status ${status})`)
        const token = parts[1]
        if (!token) throw new Error('Resposta da ACT sem carimbo')
        const signedData = ((token.value as forge.asn1.Asn1[])[1].value as forge.asn1.Asn1[])[0]
        const encap = (signedData.value as forge.asn1.Asn1[])[2]
        const explicit = (encap.value as forge.asn1.Asn1[])[1]
        const octet = (explicit.value as forge.asn1.Asn1[])[0]
        const tstDer =
            typeof octet.value === 'string'
                ? octet.value
                : (octet.value as forge.asn1.Asn1[]).map((chunk) => chunk.value as string).join('')
        const tstInfo = asn1.fromDer(tstDer).value as forge.asn1.Asn1[]
        const imprint = (tstInfo[2].value as forge.asn1.Asn1[])[1].value as string
        if (forge.util.bytesToHex(imprint) !== expectedSha256Hex.toLowerCase()) {
            throw new Error('O carimbo não corresponde ao hash enviado')
        }
        const genTime = asn1.generalizedTimeToDate(tstInfo[4].value as string)
        return { genTime }
    }

    async stamp(sha256Hex: string): Promise<TimestampResult> {
        const url = env().TSA_URL
        if (!url) return { status: 'SKIPPED' }
        const tsa = new URL(url).host
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/timestamp-query' },
                body: new Uint8Array(TimestampService.buildRequest(sha256Hex)),
                signal: AbortSignal.timeout(8_000),
            })
            if (!res.ok) throw new Error(`ACT respondeu HTTP ${res.status}`)
            const der = Buffer.from(await res.arrayBuffer())
            const { genTime } = TimestampService.parseResponse(der, sha256Hex)
            return { status: 'OK', token: der, genTime, tsa }
        } catch (error) {
            const cause = (error as Error & { cause?: Error }).cause?.message
            return {
                status: 'FAILED',
                error: [(error as Error).message, cause].filter(Boolean).join(': '),
                tsa,
            }
        }
    }
}
