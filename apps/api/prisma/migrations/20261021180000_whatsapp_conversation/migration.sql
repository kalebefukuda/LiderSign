ALTER TABLE "Envelope" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'LINK',
ADD COLUMN "conversationState" TEXT;

ALTER TABLE "Message" ADD COLUMN "direction" TEXT NOT NULL DEFAULT 'OUT',
ADD COLUMN "type" TEXT NOT NULL DEFAULT 'TEXT',
ADD COLUMN "payload" JSONB;

CREATE INDEX "Message_tenantId_to_createdAt_idx" ON "Message"("tenantId", "to", "createdAt");
