-- O signatário confirma o próprio CPF antes de ver o documento
ALTER TABLE "Envelope" ADD COLUMN "identityAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "identityVerifiedAt" TIMESTAMP(3);
