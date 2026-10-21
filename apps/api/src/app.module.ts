import { DynamicModule, Logger, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ServeStaticModule } from '@nestjs/serve-static'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { env } from './config/env'
import { CoreModule } from './core.module'
import { DemoController } from './demo/demo.controller'
import { EnvelopesController } from './envelopes/envelopes.controller'
import { EnvelopesService } from './envelopes/envelopes.service'
import { ReminderService } from './envelopes/reminder.service'
import { EventsController } from './events/events.controller'
import { HealthController } from './health/health.controller'
import { OfficeLoginController } from './office/office-login.controller'
import { OfficeController, PartnerInfoController } from './office/office.controller'
import { SigningController } from './signing/signing.controller'
import { SigningService } from './signing/signing.service'
import { TemplateImportService } from './templates/template-import.service'
import { TemplatesController } from './templates/templates.controller'
import { TemplatesService } from './templates/templates.service'
import { TenantsController } from './tenants/tenants.controller'
import { TenantsService } from './tenants/tenants.service'
import { VerificationController } from './verification/verification.controller'
import { VerificationService } from './verification/verification.service'

@Module({
    controllers: [TemplatesController],
    providers: [TemplatesService, TemplateImportService],
    exports: [TemplatesService],
})
export class TemplatesModule {}

@Module({
    imports: [TemplatesModule],
    controllers: [TenantsController],
    providers: [TenantsService],
    exports: [TenantsService],
})
export class TenantsModule {}

@Module({
    imports: [TemplatesModule],
    controllers: [EnvelopesController, EventsController],
    providers: [EnvelopesService, ReminderService],
})
export class EnvelopesModule {}

@Module({ controllers: [SigningController], providers: [SigningService] })
export class SigningModule {}

@Module({ controllers: [VerificationController], providers: [VerificationService] })
export class VerificationModule {}

@Module({ imports: [TenantsModule], controllers: [DemoController] })
export class DemoModule {}

@Module({ controllers: [OfficeController, OfficeLoginController, PartnerInfoController] })
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
            exclude: ['/v1/{*path}', '/entrar', '/health'],
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
                EnvelopesModule,
                SigningModule,
                VerificationModule,
                OfficeModule,
                HealthModule,
                ...(env().DEMO_MODE ? [DemoModule] : []),
                ...webStatic(),
            ],
            providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
        }
    }
}
