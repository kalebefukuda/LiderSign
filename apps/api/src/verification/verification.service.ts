import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
import type { Envelope, EnvelopeEvent, Tenant } from '@prisma/client'
import {
    AUDIT_EVENT_LABEL,
    maskCpf,
    maskName,
    type AssuranceLevel,
    type AuditEventType,
    type EnvelopeStatus,
    type FileCheckResponse,
    type PublicVerificationDto,
    type TimestampStatus,
} from '@lidersign/shared'
import { AuditService } from '../audit/audit.service'
import { normalizeVerificationCode, sha256Hex } from '../common/crypto'
import { PrismaService } from '../prisma/prisma.service'

type FullEnvelope = Envelope & { tenant: Tenant; events: EnvelopeEvent[] }

/** Recalcula a cadeia: cada evento precisa apontar para o hash do anterior e ter o próprio hash correto. */
function chainIntact(events: EnvelopeEvent[]): boolean {
    let prev: string | null = null
    for (const event of events) {
        if (event.prevHash !== prev) return false
        if (AuditService.computeHash(prev, event.type, event.data, event.createdAt) !== event.hash) return false
        prev = event.hash
    }
    return true
}

/** Verificação pública: qualquer pessoa (juiz, parte contrária) confere sem login. Dados sempre mascarados. */
@Injectable()
export class VerificationService {
    constructor(private readonly prisma: PrismaService) {}

    private toDto(envelope: FullEnvelope): PublicVerificationDto {
        return {
            valid: envelope.status === 'COMPLETED' && Boolean(envelope.signedSha256),
            code: envelope.verificationCode,
            title: envelope.title,
            officeName: envelope.tenant.name,
            status: envelope.status as EnvelopeStatus,
            assuranceLevel: envelope.assuranceLevel as AssuranceLevel,
            signer: {
                nameMasked: maskName(envelope.signerName),
                cpfMasked: maskCpf(envelope.signerCpf),
                cpfConfirmed: envelope.events.some((event) => event.type === 'IDENTITY_CONFIRMED'),
                phoneVerified: envelope.events.some((event) => event.type === 'OTP_VERIFIED'),
            },
            signedAt: envelope.signedAt?.toISOString() ?? null,
            completedAt: envelope.completedAt?.toISOString() ?? null,
            originalSha256: envelope.originalSha256,
            signedSha256: envelope.signedSha256,
            timestamp: {
                status: envelope.timestampStatus as TimestampStatus,
                genTime: envelope.timestampGenTime?.toISOString() ?? null,
                tsa: envelope.timestampTsa,
            },
            trail: envelope.events.map((event) => ({
                label: AUDIT_EVENT_LABEL[event.type as AuditEventType] ?? event.type,
                at: event.createdAt.toISOString(),
            })),
            trailIntact: chainIntact(envelope.events),
        }
    }

    private include = {
        tenant: true,
        events: { orderBy: [{ createdAt: 'asc' as const }, { id: 'asc' as const }] },
    }

    async byCode(input: string): Promise<PublicVerificationDto> {
        const code = normalizeVerificationCode(input)
        if (!code) throw new NotFoundException('Código não encontrado. Confira os 8 caracteres.')
        const envelope = await this.prisma.envelope.findUnique({
            where: { verificationCode: code },
            include: this.include,
        })
        if (!envelope) throw new NotFoundException('Código não encontrado. Confira os 8 caracteres.')
        return this.toDto(envelope)
    }

    /** Compara o SHA-256 do arquivo com o PDF selado. Um byte alterado = não confere. */
    async byFile(file: { buffer: Buffer } | undefined): Promise<FileCheckResponse> {
        if (!file?.buffer?.length) throw new UnprocessableEntityException('Envie o PDF no campo "file".')
        const sha256 = sha256Hex(file.buffer)
        const signed = await this.prisma.envelope.findFirst({ where: { signedSha256: sha256 }, include: this.include })
        if (signed) return { match: true, sha256, verification: this.toDto(signed) }
        // É o original sem as assinaturas? Não confere, mas dá para apontar o envelope.
        const original = await this.prisma.envelope.findFirst({
            where: { originalSha256: sha256 },
            include: this.include,
        })
        return { match: false, sha256, verification: original ? this.toDto(original) : null }
    }
}
