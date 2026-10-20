import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common'
import { ASSURANCE_LEVEL_LABEL, AUDIT_EVENT_LABEL, maskCpf, maskPhone, formatDateTimeBr } from '@lidersign/shared'
import type { AssuranceLevel, AuditEventType } from '@lidersign/shared'
import { pdflibAddPlaceholder } from '@signpdf/placeholder-pdf-lib'
import signpdf from '@signpdf/signpdf'
import { P12Signer } from '@signpdf/signer-p12'
import { SUBFILTER_ETSI_CADES_DETACHED } from '@signpdf/utils'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import QRCode from 'qrcode'
import { AuditService } from '../audit/audit.service'
import { sha256Hex } from '../common/crypto'
import { signingUrlFor, toEnvelopeDto, verificationUrlFor } from '../common/mappers'
import { EventsService } from '../events/events.service'
import { MessagingService } from '../messaging/messaging.service'
import { signedCopyText } from '../messaging/texts'
import { PrismaService } from '../prisma/prisma.service'
import { StorageService } from '../storage/storage.service'
import { WebhooksService } from '../webhooks/webhooks.service'
import { CertificateService } from './certificate.service'
import { buildEvidenceDefinition, summarizeUserAgent } from './evidence-page'
import { renderPdf } from './pdf-render.service'
import { TimestampService } from './timestamp.service'

const RETRY_DELAYS_MS = [0, 3_000, 10_000]
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

type Evidence = {
    ip: string | null
    userAgent: string | null
    geolocation: { lat: number; lng: number; accuracy?: number } | null
    consentText: string
    signedAt: string
}

/** Helvetica padrão só cobre WinAnsi: remove o que não couber para o carimbo nunca quebrar. */
function winAnsi(text: string): string {
    return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
}

function imageMime(data: Buffer): 'image/png' | 'image/jpeg' | 'image/webp' | null {
    if (data.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return 'image/png'
    if (data[0] === 0xff && data[1] === 0xd8) return 'image/jpeg'
    if (data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP') {
        return 'image/webp'
    }
    return null
}

/**
 * Selagem: carimbo do tempo, rodapé em todas as páginas, página de evidências e selo PAdES.
 * Nunca entrega PDF sem selo: se algo falhar, o envelope fica em SIGNED e a selagem é refeita.
 */
@Injectable()
export class SealService implements OnApplicationBootstrap {
    private readonly logger = new Logger('Selagem')
    private readonly running = new Set<string>()

    constructor(
        private readonly prisma: PrismaService,
        private readonly storage: StorageService,
        private readonly certificate: CertificateService,
        private readonly timestamp: TimestampService,
        private readonly audit: AuditService,
        private readonly messaging: MessagingService,
        private readonly webhooks: WebhooksService,
        private readonly events: EventsService,
    ) {}

    /** Retoma selagens interrompidas (ex.: reinício do servidor). */
    async onApplicationBootstrap() {
        void this.certificate.getP12().catch((error) => this.logger.error(`Certificado: ${(error as Error).message}`))
        const stuck = await this.prisma.envelope.findMany({ where: { status: 'SIGNED' }, select: { id: true } })
        for (const { id } of stuck) this.start(id, null)
    }

    /** Dispara em segundo plano. rawToken (só em memória) serve para mandar o link da cópia. */
    start(envelopeId: string, rawToken: string | null) {
        if (this.running.has(envelopeId)) return
        this.running.add(envelopeId)
        void this.runWithRetries(envelopeId, rawToken).finally(() => this.running.delete(envelopeId))
    }

    private async runWithRetries(envelopeId: string, rawToken: string | null) {
        for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
            await sleep(RETRY_DELAYS_MS[attempt])
            try {
                const sealed = await this.seal(envelopeId)
                if (sealed) await this.complete(envelopeId, rawToken)
                return
            } catch (error) {
                this.logger.error(
                    `Falha ao selar ${envelopeId} (tentativa ${attempt + 1}): ${(error as Error).stack ?? error}`,
                )
            }
        }
    }

    private async stampTime(envelopeId: string) {
        const envelope = await this.prisma.envelope.findUniqueOrThrow({ where: { id: envelopeId } })
        if (envelope.timestampStatus !== 'PENDING') return
        const result = await this.timestamp.stamp(envelope.originalSha256)
        if (result.status === 'OK') {
            await this.storage.put(StorageService.envelopeKey(envelope.tenantId, envelope.id, 'timestamp.tsr'), result.token)
            await this.prisma.envelope.update({
                where: { id: envelope.id },
                data: {
                    timestampStatus: 'OK',
                    timestampToken: new Uint8Array(result.token),
                    timestampGenTime: result.genTime,
                    timestampTsa: result.tsa,
                },
            })
            await this.audit.append(envelope.id, 'TIMESTAMP_ISSUED', 'system', {
                tsa: result.tsa,
                genTime: result.genTime.toISOString(),
                sha256: envelope.originalSha256,
            })
        } else {
            const reason = result.status === 'SKIPPED' ? 'Carimbo do tempo desligado nesta instalação' : result.error
            await this.prisma.envelope.update({
                where: { id: envelope.id },
                data: {
                    timestampStatus: result.status,
                    timestampTsa: result.status === 'FAILED' ? result.tsa : null,
                },
            })
            await this.audit.append(envelope.id, 'TIMESTAMP_FAILED', 'system', {
                tsa: result.status === 'FAILED' ? result.tsa : null,
                motivo: reason.slice(0, 300),
            })
            this.logger.warn(`Carimbo do tempo indisponível para ${envelope.id}: ${reason}`)
        }
    }

    /** true quando o PDF selado foi gravado agora. */
    async seal(envelopeId: string): Promise<boolean> {
        const current = await this.prisma.envelope.findUnique({ where: { id: envelopeId } })
        if (!current || current.status !== 'SIGNED') return false

        // 1. Carimbo do tempo sobre o hash do original
        await this.stampTime(envelopeId)

        const envelope = await this.prisma.envelope.findUniqueOrThrow({
            where: { id: envelopeId },
            include: { tenant: true, events: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] } },
        })
        const original = await this.storage.get(envelope.originalPath)
        const verifyUrl = verificationUrlFor(envelope.verificationCode)

        // 2. Página de evidências
        const evidence = (envelope.evidence ?? {}) as unknown as Evidence
        let signature: { type: 'drawn'; imageDataUrl: string } | { type: 'typed'; typedName: string }
        if (envelope.signatureType === 'drawn' && envelope.signatureImagePath) {
            const png = await this.storage.get(envelope.signatureImagePath)
            signature = { type: 'drawn', imageDataUrl: `data:image/png;base64,${png.toString('base64')}` }
        } else {
            signature = { type: 'typed', typedName: envelope.typedName ?? envelope.signerName }
        }
        let selfieDataUrl: string | null = null
        let selfieNote: string | null = null
        if (envelope.selfiePath) {
            const selfie = await this.storage.get(envelope.selfiePath)
            const mime = imageMime(selfie)
            if (mime === 'image/png' || mime === 'image/jpeg') {
                selfieDataUrl = `data:${mime};base64,${selfie.toString('base64')}`
            } else {
                selfieNote = 'Selfie registrada (arquivo guardado nas evidências)'
            }
        }
        const timestampText =
            envelope.timestampStatus === 'OK' && envelope.timestampGenTime
                ? `Emitido por ${envelope.timestampTsa} em ${formatDateTimeBr(envelope.timestampGenTime)} (horário de Brasília)`
                : envelope.timestampStatus === 'SKIPPED'
                  ? 'Desligado nesta instalação'
                  : `Indisponível no momento da selagem${envelope.timestampTsa ? ` (${envelope.timestampTsa})` : ''}`
        const geo = evidence.geolocation
        const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 288, errorCorrectionLevel: 'M' })

        const evidencePdf = await renderPdf(
            buildEvidenceDefinition({
                title: envelope.title,
                officeName: envelope.tenant.name,
                verificationCode: envelope.verificationCode,
                verificationUrl: verifyUrl,
                qrDataUrl,
                signer: {
                    name: envelope.signerName,
                    cpfMasked: maskCpf(envelope.signerCpf),
                    phoneMasked: maskPhone(envelope.signerPhone),
                },
                signature,
                selfieDataUrl,
                selfieNote,
                assuranceLabel: ASSURANCE_LEVEL_LABEL[envelope.assuranceLevel as AssuranceLevel] ?? envelope.assuranceLevel,
                signedAt: envelope.signedAt ?? new Date(),
                ip: evidence.ip ?? null,
                device: summarizeUserAgent(evidence.userAgent ?? null),
                geolocation: geo
                    ? `${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}${geo.accuracy ? ` (precisão de ${Math.round(geo.accuracy)} m)` : ''}`
                    : 'Não autorizada pelo signatário',
                consentText: evidence.consentText ?? '',
                originalSha256: envelope.originalSha256,
                timestamp: timestampText,
                trail: envelope.events.map((event) => ({
                    at: event.createdAt,
                    label: AUDIT_EVENT_LABEL[event.type as AuditEventType] ?? event.type,
                    hash: event.hash,
                })),
            }),
        )

        // 3. Junta original + evidências e carimba o rodapé em todas as páginas
        const doc = await PDFDocument.load(original)
        const evidenceDoc = await PDFDocument.load(evidencePdf)
        const pages = await doc.copyPages(evidenceDoc, evidenceDoc.getPageIndices())
        pages.forEach((page) => doc.addPage(page))
        const helvetica = await doc.embedFont(StandardFonts.Helvetica)
        const stamp = winAnsi(
            `Assinado eletronicamente via LíderSign · Código ${envelope.verificationCode} · Verifique em ${verifyUrl}`,
        )
        for (const page of doc.getPages()) {
            const { width } = page.getSize()
            let size = 7
            while (size > 5 && helvetica.widthOfTextAtSize(stamp, size) > width - 80) size -= 0.25
            const textWidth = helvetica.widthOfTextAtSize(stamp, size)
            page.drawText(stamp, {
                x: (width - textWidth) / 2,
                y: 18,
                size,
                font: helvetica,
                color: rgb(0.42, 0.45, 0.5),
            })
        }
        doc.setTitle(envelope.title)
        doc.setProducer('LíderSign')
        doc.setCreator('LíderSign')

        // 4. Selo PAdES (ETSI.CAdES.detached) com o certificado da plataforma
        pdflibAddPlaceholder({
            pdfDoc: doc,
            reason: 'Selo de integridade LíderSign',
            contactInfo: verifyUrl,
            name: 'LíderSign',
            location: 'Brasil',
            signatureLength: 16_384,
            subFilter: SUBFILTER_ETSI_CADES_DETACHED,
            appName: 'LíderSign',
        })
        const prepared = Buffer.from(await doc.save({ useObjectStreams: false }))
        const signer = new P12Signer(await this.certificate.getP12(), { passphrase: this.certificate.passphrase })
        const signed = await signpdf.sign(prepared, signer)

        // 5. Grava e registra
        const signedSha256 = sha256Hex(signed)
        const signedPath = StorageService.envelopeKey(envelope.tenantId, envelope.id, 'signed.pdf')
        await this.storage.put(signedPath, signed)
        await this.prisma.envelope.update({ where: { id: envelope.id }, data: { signedPath, signedSha256 } })
        await this.audit.append(envelope.id, 'DOCUMENT_SEALED', 'system', {
            sha256: signedSha256,
            padesSubFilter: SUBFILTER_ETSI_CADES_DETACHED,
            pages: doc.getPageCount(),
        })
        return true
    }

    private async complete(envelopeId: string, rawToken: string | null) {
        const envelope = await this.prisma.envelope.update({
            where: { id: envelopeId },
            data: { status: 'COMPLETED', completedAt: new Date() },
            include: { tenant: true },
        })
        this.events.emit(envelope.tenantId, { type: 'envelope.updated', envelope: toEnvelopeDto(envelope) })
        this.webhooks.dispatch(envelope.tenant, envelope, 'envelope.completed')
        if (rawToken) {
            const copyUrl = signingUrlFor(rawToken)
            const message = await this.messaging.send({
                tenantId: envelope.tenantId,
                envelopeId: envelope.id,
                to: envelope.signerPhone,
                kind: 'SIGNED_COPY',
                body: signedCopyText(
                    envelope.signerName,
                    envelope.title,
                    copyUrl,
                    verificationUrlFor(envelope.verificationCode),
                ),
                url: copyUrl,
            })
            await this.audit.append(envelope.id, 'COPY_SENT', 'system', {
                provider: message.provider,
                status: message.status,
            })
        }
        this.logger.log(`Envelope ${envelope.id} assinado e selado`)
    }
}
