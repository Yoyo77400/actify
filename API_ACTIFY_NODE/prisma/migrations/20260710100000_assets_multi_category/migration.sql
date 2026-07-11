-- DropForeignKey
ALTER TABLE "listings" DROP CONSTRAINT IF EXISTS "listings_category_id_fkey";

-- AlterTable: drop single category_id, license becomes optional, add new columns
ALTER TABLE "listings" DROP COLUMN IF EXISTS "category_id";
ALTER TABLE "listings" ALTER COLUMN "license_id" DROP NOT NULL;
ALTER TABLE "listings" ADD COLUMN "slug" TEXT;
ALTER TABLE "listings" ADD COLUMN "short_description" TEXT;
ALTER TABLE "listings" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "listings_slug_key" ON "listings"("slug");

-- CreateTable
CREATE TABLE "listing_categories" (
    "listing_id" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,

    CONSTRAINT "listing_categories_pkey" PRIMARY KEY ("listing_id","category_id")
);

-- AddForeignKey
ALTER TABLE "listing_categories" ADD CONSTRAINT "listing_categories_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listing_categories" ADD CONSTRAINT "listing_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
