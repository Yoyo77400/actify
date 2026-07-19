-- AlterTable: 2FA (TOTP) — secret écrit à l'enrôlement, enabled après confirmation
ALTER TABLE "users" ADD COLUMN     "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "two_factor_secret" TEXT;
