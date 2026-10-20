-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "webhookUrl" TEXT,
    "webhookSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'CONTRATO',
    "assuranceLevel" TEXT NOT NULL DEFAULT 'PADRAO',
    "body" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Envelope" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersion" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "assuranceLevel" TEXT NOT NULL DEFAULT 'PADRAO',
    "variables" JSONB NOT NULL,
    "renderedBody" TEXT NOT NULL,
    "externalRef" TEXT,
    "signerName" TEXT NOT NULL,
    "signerCpf" TEXT NOT NULL,
    "signerPhone" TEXT NOT NULL,
    "signerEmail" TEXT,
    "tokenHash" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "otpHash" TEXT,
    "otpExpiresAt" TIMESTAMP(3),
    "otpSentAt" TIMESTAMP(3),
    "otpAttempts" INTEGER NOT NULL DEFAULT 0,
    "otpVerifiedAt" TIMESTAMP(3),
    "originalPath" TEXT NOT NULL,
    "originalSha256" TEXT NOT NULL,
    "signedPath" TEXT,
    "signedSha256" TEXT,
    "selfiePath" TEXT,
    "signatureType" TEXT,
    "signatureImagePath" TEXT,
    "typedName" TEXT,
    "evidence" JSONB,
    "timestampStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "timestampToken" BYTEA,
    "timestampGenTime" TIMESTAMP(3),
    "timestampTsa" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Envelope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnvelopeEvent" (
    "id" TEXT NOT NULL,
    "envelopeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actor" TEXT NOT NULL DEFAULT 'system',
    "data" JSONB NOT NULL DEFAULT '{}',
    "ip" TEXT,
    "userAgent" TEXT,
    "prevHash" TEXT,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnvelopeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "envelopeId" TEXT,
    "to" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "envelopeId" TEXT,
    "event" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "statusCode" INTEGER,
    "ok" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_externalId_key" ON "Tenant"("externalId");

-- CreateIndex
CREATE INDEX "Template_tenantId_archived_idx" ON "Template"("tenantId", "archived");

-- CreateIndex
CREATE UNIQUE INDEX "Envelope_tokenHash_key" ON "Envelope"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Envelope_verificationCode_key" ON "Envelope"("verificationCode");

-- CreateIndex
CREATE INDEX "Envelope_tenantId_createdAt_idx" ON "Envelope"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Envelope_signedSha256_idx" ON "Envelope"("signedSha256");

-- CreateIndex
CREATE INDEX "EnvelopeEvent_envelopeId_createdAt_idx" ON "EnvelopeEvent"("envelopeId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_tenantId_createdAt_idx" ON "Message"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookDelivery_tenantId_createdAt_idx" ON "WebhookDelivery"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Envelope" ADD CONSTRAINT "Envelope_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Envelope" ADD CONSTRAINT "Envelope_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnvelopeEvent" ADD CONSTRAINT "EnvelopeEvent_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "Envelope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "Envelope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_envelopeId_fkey" FOREIGN KEY ("envelopeId") REFERENCES "Envelope"("id") ON DELETE CASCADE ON UPDATE CASCADE;

