import { DynamicModule, Logger, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ServeStaticModule } from '@nestjs/serve-static'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { AssistantController } from './assistant/assistant.controller'
import { AssistantService } from './assistant/assistant.service'
import { env } from './config/env'
import { ContactsController } from './contacts/contacts.controller'
import { ContactsService } from './contacts/contacts.service'
import { ContractsController } from './contracts/contracts.controller'
import { CoreModule } from './core.module'
import { EnvelopesController } from './envelopes/envelopes.controller'
import { EnvelopesService } from './envelopes/envelopes.service'
import { ReminderService } from './envelopes/reminder.service'
import { EventsController } from './events/events.controller'
import { HealthController } from './health/health.controller'
import { OfficeController } from './office/office.controller'
import { SessionController } from './session/session.controller'
import { SigningController } from './signing/signing.controller'
import { TemplateImportService } from './templates/template-import.service'
import { TemplatesController } from './templates/templates.controller'
import { TemplatesService } from './templates/templates.service'
import { TenantsController } from './tenants/tenants.controller'
import { TenantsService } from './tenants/tenants.service'
import { VerificationController } from './verification/verification.controller'
import { VerificationService } from './verification/verification.service'
import { WhatsAppController } from './whatsapp/whatsapp.controller'

@Module({
    controllers: [TemplatesController],
    providers: [TemplatesService, TemplateImportService],
    exports: [TemplatesService, TemplateImportService],
})
export class TemplatesModule {}

@Module({
    imports: [TemplatesModule],
    controllers: [TenantsController],
    providers: [TenantsService],
    exports: [TenantsService],
})
export class TenantsModule {}

/** O módulo de contratos: envelopes, conversa no WhatsApp, contatos, funil e Assistente. */
@Module({
    imports: [TemplatesModule, TenantsModule],
    controllers: [
        EnvelopesController,
        EventsController,
        ContactsController,
        WhatsAppController,
        ContractsController,
        AssistantController,
        SessionController,
    ],
    providers: [EnvelopesService, ReminderService, ContactsService, AssistantService],
})
export class ContractsModule {}

@Module({ controllers: [SigningController] })
export class SigningModule {}

@Module({ controllers: [VerificationController], providers: [VerificationService] })
export class VerificationModule {}

@Module({ controllers: [OfficeController] })
export class OfficeModule {}

@Module({ controllers: [HealthController] })
export class HealthModule {}

function webStatic(): DynamicModule[] {
    const dist = env().WEB_DIST_DIR
        ? resolve(env().WEB_DIST_DIR as string)
        : resolve(__dirname, '../../web/dist')
    if (!existsSync(join(dist, 'index.html'))) {
        Logger.log(
            `Site não encontrado em ${dist}: servindo só a API (em dev, use o Vite na porta 3000)`,
            'Web',
        )
        return []
    }
    return [
        ServeStaticModule.forRoot({
            rootPath: dist,
            exclude: ['/v1/{*path}', '/health'],
            serveStaticOptions: { index: false, maxAge: '1h' },
        }),
    ]
}

@Module({})
export class AppModule {
    static register(): DynamicModule {
        return {
            module: AppModule,
            imports: [
                ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 240 }]),
                CoreModule,
                TemplatesModule,
                TenantsModule,
                ContractsModule,
                SigningModule,
                VerificationModule,
                OfficeModule,
                HealthModule,
                ...webStatic(),
            ],
            providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
        }
    }
}
