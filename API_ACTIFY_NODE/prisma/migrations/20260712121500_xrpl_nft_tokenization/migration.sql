-- Rework the nfts table from EVM/ERC-721 vocabulary to XRPL XLS-20.
-- The table has no rows (no service ever wrote it), so dropping/adding
-- NOT NULL columns is safe.

ALTER TABLE "nfts" DROP COLUMN "token_id";
ALTER TABLE "nfts" DROP COLUMN "contract_address";

-- License is now optional: an asset is tokenized on publish, license tiers
-- are a later feature.
ALTER TABLE "nfts" ALTER COLUMN "license_id" DROP NOT NULL;

ALTER TABLE "nfts" ADD COLUMN "nftoken_id" TEXT NOT NULL;
ALTER TABLE "nfts" ADD COLUMN "issuer" TEXT NOT NULL;
ALTER TABLE "nfts" ADD COLUMN "taxon" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "nfts" ADD COLUMN "uri" TEXT;
ALTER TABLE "nfts" ADD COLUMN "mint_tx_hash" TEXT NOT NULL;

CREATE UNIQUE INDEX "nfts_nftoken_id_key" ON "nfts"("nftoken_id");
CREATE UNIQUE INDEX "nfts_mint_tx_hash_key" ON "nfts"("mint_tx_hash");
