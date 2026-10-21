-- O CPF confirmado na conversa do WhatsApp não libera o link do navegador:
-- quem abre o link confirma o CPF de novo (link encaminhado não assina sozinho).
ALTER TABLE "Envelope" ADD COLUMN "linkIdentityVerifiedAt" TIMESTAMP(3);
UPDATE "Envelope" SET "linkIdentityVerifiedAt" = "identityVerifiedAt" WHERE "channel" = 'LINK';

-- Deduplicação de webhooks da Meta (o mesmo wamid pode chegar mais de uma vez)
CREATE INDEX "Message_providerMessageId_idx" ON "Message"("providerMessageId");
