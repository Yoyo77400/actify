-- DropForeignKey
ALTER TABLE "listings" DROP CONSTRAINT "listings_license_id_fkey";

-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "payment_address" TEXT,
ADD COLUMN     "payment_tag" INTEGER;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
