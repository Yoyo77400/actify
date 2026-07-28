-- Verrouillage par COMPTE des vérifications TOTP. Le rate limit existant est
-- par IP : un attaquant réparti sur plusieurs adresses le contourne, alors que
-- le compte visé, lui, ne se bloque jamais.
ALTER TABLE "users" ADD COLUMN     "totp_failed_attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN     "totp_locked_until" TIMESTAMP(3);
