import { Global, Module } from '@nestjs/common'
import { AiService } from './ai/ai.service'
import { AuditService } from './audit/audit.service'
import { ExpirationService } from './envelopes/expiration.service'
import { EventsService } from './events/events.service'
import { MessagingService } from './messaging/messaging.service'
import { PrismaService } from './prisma/prisma.service'
import { CertificateService } from './sealing/certificate.service'
import { PdfRenderService } from './sealing/pdf-render.service'
import { SealService } from './sealing/seal.service'
import { TimestampService } from './sealing/timestamp.service'
import { SigningService } from './signing/signing.service'
import { StorageService } from './storage/storage.service'
import { WebhooksService } from './webhooks/webhooks.service'
import { ContractExplainerService } from './whatsapp/contract-explainer.service'
import { ConversationService } from './whatsapp/conversation.service'

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
    AiService,
    SigningService,
    ContractExplainerService,
    ConversationService,
]

@Global()
@Module({ providers, exports: providers })
export class CoreModule {}
