import { prisma } from './prisma'
import { AppError } from '../utils/http'
import { generateNonce } from '../utils/nonce'
import { getChainVerifier } from './chains'
import { signAccessToken, signRefreshToken } from '../utils/jwt'

const CHALLENGE_TTL_MS = 5 * 60 * 1000
const DEFAULT_ROLE_NAME = 'user'
const ADMIN_ROLE_NAME = 'admin'

export interface ChallengeInput {
  address: string
  chain: string
}

export interface VerifyInput {
  address: string
  publicKey: string
  signature: string
  nonce: string
  chain: string
}

export interface UpdateWalletInput {
  label?: string | null
  isPrimary?: boolean
}

function serializeWallet(wallet: {
  id: string
  address: string
  chain: string
  label: string | null
  isPrimary: boolean
  createdAt: Date
}) {
  return {
    id: wallet.id,
    address: wallet.address,
    chain: wallet.chain,
    label: wallet.label,
    isPrimary: wallet.isPrimary,
    createdAt: wallet.createdAt,
  }
}

async function getRoleId(name: string): Promise<number> {
  const existing = await prisma.role.findFirst({ where: { name } })
  if (existing) return existing.id
  const created = await prisma.role.create({ data: { name } })
  return created.id
}

// Bootstrap the platform admin from ADMIN_WALLET_ADDRESS: whenever that exact
// wallet authenticates, its account is (re)promoted to admin — works even for
// the very first login before any account exists. No env set → no-op.
async function promoteIfAdminWallet(
  user: { id: string; role: { name: string } },
  address: string,
): Promise<{ id: string; username: string | null; role: { name: string } }> {
  const adminAddress = process.env.ADMIN_WALLET_ADDRESS?.trim()
  if (!adminAddress || address !== adminAddress || user.role.name === ADMIN_ROLE_NAME) {
    return user as { id: string; username: string | null; role: { name: string } }
  }
  const adminRoleId = await getRoleId(ADMIN_ROLE_NAME)
  return prisma.user.update({
    where: { id: user.id },
    data: { roleId: adminRoleId },
    include: { role: true },
  })
}

export async function createChallenge(input: ChallengeInput) {
  if (!input.address || !input.chain) {
    throw new AppError(400, 'VALIDATION_ERROR', 'address et chain sont requis')
  }
  // Fail fast on an unsupported chain rather than issuing a challenge nobody can ever verify.
  getChainVerifier(input.chain)

  const nonce = generateNonce()
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS)
  const message = [
    'Actify wallet verification',
    `address: ${input.address}`,
    `nonce: ${nonce}`,
    `issued: ${new Date().toISOString()}`,
  ].join('\n')

  await prisma.walletChallenge.create({
    data: { address: input.address, chain: input.chain, nonce, message, expiresAt },
  })

  return { nonce, message, expiresAt }
}

export async function verifyChallenge(input: VerifyInput, authenticatedUserId: string | null) {
  if (!input.address || !input.publicKey || !input.signature || !input.nonce || !input.chain) {
    throw new AppError(400, 'VALIDATION_ERROR', 'address, publicKey, signature, nonce et chain sont requis')
  }

  const challenge = await prisma.walletChallenge.findUnique({ where: { nonce: input.nonce } })
  if (!challenge || challenge.address !== input.address || challenge.chain !== input.chain) {
    throw new AppError(400, 'CHALLENGE_INVALID', 'Challenge introuvable pour ce wallet')
  }
  if (challenge.consumedAt) {
    throw new AppError(400, 'CHALLENGE_INVALID', 'Challenge déjà utilisé')
  }
  if (challenge.expiresAt < new Date()) {
    throw new AppError(400, 'CHALLENGE_EXPIRED', 'Challenge expiré, demandez-en un nouveau')
  }

  const verifier = getChainVerifier(input.chain)
  const isValid = verifier.verify({
    address: input.address,
    publicKey: input.publicKey,
    signature: input.signature,
    message: challenge.message,
  })
  if (!isValid) {
    throw new AppError(401, 'INVALID_SIGNATURE', 'Signature invalide')
  }

  await prisma.walletChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } })

  const existingWallet = await prisma.wallet.findUnique({
    where: { address: input.address },
    include: { user: { include: { role: true } } },
  })

  // Caller already has a session: this verified signature links an
  // additional wallet to that account rather than logging anyone in.
  if (authenticatedUserId) {
    if (existingWallet && existingWallet.userId !== authenticatedUserId) {
      throw new AppError(409, 'WALLET_ALREADY_LINKED', 'Ce wallet est déjà lié à un autre compte')
    }
    if (!existingWallet) {
      const hasPrimary = await prisma.wallet.findFirst({ where: { userId: authenticatedUserId, isPrimary: true } })
      await prisma.wallet.create({
        data: {
          userId: authenticatedUserId,
          address: input.address,
          chain: input.chain,
          isPrimary: !hasPrimary,
        },
      })
    }
    return { mode: 'linked' as const }
  }

  // No session: the signature itself is the login — or the signup, if this
  // wallet has never been seen before.
  let user = existingWallet?.user ?? null
  let isNewAccount = false

  if (!user) {
    isNewAccount = true
    const roleId = await getRoleId(DEFAULT_ROLE_NAME)
    user = await prisma.user.create({
      data: {
        roleId,
        wallets: { create: { address: input.address, chain: input.chain, isPrimary: true } },
      },
      include: { role: true },
    })
  }

  if (user.deletedAt) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Ce compte a été supprimé')
  }
  if (user.isBanned) {
    throw new AppError(403, 'USER_BANNED', 'Compte banni')
  }

  const finalUser = await promoteIfAdminWallet(user, input.address)

  return {
    mode: 'authenticated' as const,
    isNewAccount,
    accessToken: signAccessToken(finalUser.id),
    refreshToken: signRefreshToken(finalUser.id),
    user: { id: finalUser.id, username: finalUser.username, role: finalUser.role.name },
  }
}

export async function listWallets(userId: string) {
  const wallets = await prisma.wallet.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } })
  return wallets.map(serializeWallet)
}

async function getOwnedWalletOrThrow(userId: string, walletId: string) {
  const wallet = await prisma.wallet.findUnique({ where: { id: walletId } })
  if (!wallet || wallet.userId !== userId) {
    throw new AppError(404, 'NOT_FOUND', 'Wallet introuvable')
  }
  return wallet
}

export async function updateWallet(userId: string, walletId: string, input: UpdateWalletInput) {
  await getOwnedWalletOrThrow(userId, walletId)

  if (input.isPrimary) {
    await prisma.$transaction([
      prisma.wallet.updateMany({ where: { userId, isPrimary: true }, data: { isPrimary: false } }),
      prisma.wallet.update({
        where: { id: walletId },
        data: { isPrimary: true, ...(input.label !== undefined ? { label: input.label } : {}) },
      }),
    ])
  } else if (input.label !== undefined) {
    await prisma.wallet.update({ where: { id: walletId }, data: { label: input.label } })
  }

  const updated = await prisma.wallet.findUniqueOrThrow({ where: { id: walletId } })
  return serializeWallet(updated)
}

export async function removeWallet(userId: string, walletId: string) {
  const wallet = await getOwnedWalletOrThrow(userId, walletId)

  const walletCount = await prisma.wallet.count({ where: { userId } })
  if (walletCount <= 1) {
    throw new AppError(
      400,
      'LAST_WALLET',
      'Impossible de délier votre dernier wallet : vous perdriez l\'accès à votre compte',
    )
  }

  await prisma.wallet.delete({ where: { id: walletId } })

  if (wallet.isPrimary) {
    const nextPrimary = await prisma.wallet.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } })
    if (nextPrimary) {
      await prisma.wallet.update({ where: { id: nextPrimary.id }, data: { isPrimary: true } })
    }
  }

  return { id: walletId }
}
