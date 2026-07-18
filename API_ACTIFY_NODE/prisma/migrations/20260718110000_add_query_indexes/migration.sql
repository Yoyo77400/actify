-- Query-serving indexes, derived from the actual where/orderBy of the
-- services (no speculative index). Two families:
--   1. B-tree on the FK access paths the services really filter on: seller's
--      listings, buyer's orders, per-listing reviews/favorites/downloads/
--      confirmed sales, and the reverse side of the composite PKs
--      (listing_categories/listing_tags — a PK on (a, b) serves lookups by a,
--      never by b alone).
--   2. GIN trigram (pg_trgm) on listings.title/description: search runs
--      ILIKE '%q%', which a B-tree can never serve (no left anchor); trigram
--      indexes match arbitrary substrings.
-- Rationale + EXPLAIN ANALYZE evidence: docs/query-optimization.md.
-- No CONCURRENTLY: not possible inside prisma migrate deploy's per-migration
-- transaction; the previous api container keeps serving during migrate, so
-- writes block briefly (SHARE lock) — acceptable at current table sizes.

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateIndex
CREATE INDEX "wallets_user_id_idx" ON "wallets"("user_id");

-- CreateIndex
CREATE INDEX "nfts_current_owner_id_idx" ON "nfts"("current_owner_id");

-- CreateIndex
CREATE INDEX "listings_seller_id_created_at_idx" ON "listings"("seller_id", "created_at");

-- CreateIndex
CREATE INDEX "listings_status_created_at_idx" ON "listings"("status", "created_at");

-- CreateIndex
CREATE INDEX "listings_title_idx" ON "listings" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "listings_description_idx" ON "listings" USING GIN ("description" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "listing_categories_category_id_idx" ON "listing_categories"("category_id");

-- CreateIndex
CREATE INDEX "listing_tags_tag_id_idx" ON "listing_tags"("tag_id");

-- CreateIndex
CREATE INDEX "downloads_user_id_downloaded_at_idx" ON "downloads"("user_id", "downloaded_at");

-- CreateIndex
CREATE INDEX "downloads_listing_id_idx" ON "downloads"("listing_id");

-- CreateIndex
CREATE INDEX "purchases_buyer_id_purchased_at_idx" ON "purchases"("buyer_id", "purchased_at");

-- CreateIndex
CREATE INDEX "purchases_listing_id_status_idx" ON "purchases"("listing_id", "status");

-- CreateIndex
CREATE INDEX "reviews_listing_id_created_at_idx" ON "reviews"("listing_id", "created_at");

-- CreateIndex
CREATE INDEX "reviews_reviewer_id_idx" ON "reviews"("reviewer_id");

-- CreateIndex
CREATE INDEX "favorites_listing_id_idx" ON "favorites"("listing_id");
