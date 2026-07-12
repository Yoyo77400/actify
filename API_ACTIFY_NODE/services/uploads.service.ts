import { prisma } from './prisma'
import { AppError } from '../utils/http'

async function getOwnedListingOrThrow(userId: string, listingId: string) {
  const listing = await prisma.listing.findFirst({ where: { id: listingId, deletedAt: null } })
  if (!listing || listing.sellerId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Asset introuvable')
  }
  return listing
}

/** Records the uploaded main file's storage key on the asset (owner only). */
export async function setAssetFile(userId: string, listingId: string, key: string) {
  await getOwnedListingOrThrow(userId, listingId)
  await prisma.listing.update({ where: { id: listingId }, data: { fileIpfsCid: key } })
  return { hasFile: true }
}

/** Records the uploaded thumbnail's storage key on the asset (owner only). */
export async function setAssetThumbnail(userId: string, listingId: string, key: string) {
  await getOwnedListingOrThrow(userId, listingId)
  await prisma.listing.update({ where: { id: listingId }, data: { thumbnailCid: key } })
  return { thumbnailCid: key }
}
