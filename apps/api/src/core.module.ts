import { Global, Module } from '@nestjs/common'
import { AuditService } from './audit/audit.service'
import { ExpirationService } from './envelopes/expiration.service'
import { EventsService } from './events/events.service'
import { MessagingService } from './messaging/messaging.service'
import { PrismaService } from './prisma/prisma.service'
import { CertificateService } from './sealing/certificate.service'
import { PdfRenderService } from './sealing/pdf-render.service'
import { SealService } from './sealing/seal.service'
import { TimestampService } from './sealing/timestamp.service'
import { StorageService } from './storage/storage.service'
import { WebhooksService } from './webhooks/webhooks.service'

const providers = [
    PrismaService,
    StorageService,
    AuditService,
    EventsService,
    MessagingService,
    WebhooksService,
    CertificateService,
    TimestampService,
    PdfRenderService,
    SealService,
    ExpirationService,
]

@Global()
@Module({ providers, exports: providers })
export class CoreModule {}
