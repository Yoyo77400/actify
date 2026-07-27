-- AlterTable
ALTER TABLE "collections" ADD COLUMN     "owner_id" TEXT;

-- CreateIndex
CREATE INDEX "collections_owner_id_idx" ON "collections"("owner_id");

-- AddForeignKey
-- Nullable + ON DELETE SET NULL: collections created before this column exist
-- with no owner, and erasing a user (RGPD soft delete) must not cascade-delete
-- collections that still hold other people's published listings.
ALTER TABLE "collections" ADD CONSTRAINT "collections_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
