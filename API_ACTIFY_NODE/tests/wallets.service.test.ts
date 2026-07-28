import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Prisma et le vérificateur de chaîne sont les deux seules dépendances externes
// du flux de connexion : on les remplace par des doublures pour tester la
// logique métier seule (test unitaire = on isole l'unité sous test).
vi.mock('../services/prisma', () => ({
  prisma: {
    walletChallenge: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    wallet: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    user: { create: vi.fn(), update: vi.fn() },
    role: { findFirst: vi.fn(), create: vi.fn() },
  },
}))

vi.mock('../services/chains', () => ({
  getChainVerifier: vi.fn(),
}))

import { prisma } from '../services/prisma'
import { getChainVerifier } from '../services/chains'
import { createChallenge, verifyChallenge } from '../services/wallets.service'
import { verifyToken } from '../utils/jwt'

const challengeCreate = vi.mocked(prisma.walletChallenge.create)
const challengeFindUnique = vi.mocked(prisma.walletChallenge.findUnique)
const challengeUpdate = vi.mocked(prisma.walletChallenge.update)
const walletFindUnique = vi.mocked(prisma.wallet.findUnique)
const walletFindFirst = vi.mocked(prisma.wallet.findFirst)
const walletCreate = vi.mocked(prisma.wallet.create)
const userCreate = vi.mocked(prisma.user.create)
const userUpdate = vi.mocked(prisma.user.update)
const roleFindFirst = vi.mocked(prisma.role.findFirst)
const chainVerifier = vi.mocked(getChainVerifier)

const ADDRESS = 'rAliceWallet'
const CHAIN = 'xrpl'
const NONCE = 'nonce-abc'
const PUBLIC_KEY = 'ED0123'
const SIGNATURE = 'DEADBEEF'
const CHALLENGE_MESSAGE = `Actify wallet verification\naddress: ${ADDRESS}\nnonce: ${NONCE}`

// La doublure de signature : `verify` est un espion, ce qui permet de vérifier
// non seulement le résultat mais AUSSI avec quels arguments il a été appelé.
let verifySignature: ReturnType<typeof vi.fn>

function storedChallenge(overrides: Record<string, unknown> = {}) {
  return {
    id: 'challenge-1',
    address: ADDRESS,
    chain: CHAIN,
    nonce: NONCE,
    message: CHALLENGE_MESSAGE,
    consumedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
    ...overrides,
  }
}

function validInput(overrides: Record<string, unknown> = {}) {
  return { address: ADDRESS, publicKey: PUBLIC_KEY, signature: SIGNATURE, nonce: NONCE, chain: CHAIN, ...overrides }
}

beforeEach(() => {
  vi.clearAllMocks()
  verifySignature = vi.fn().mockReturnValue(true)
  chainVerifier.mockReturnValue({ verify: verifySignature } as never)
  challengeUpdate.mockResolvedValue({} as never)
  roleFindFirst.mockResolvedValue({ id: 1, name: 'user' } as never)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('createChallenge', () => {
  it('émet un nonce et un message liant l\'adresse, avec une expiration à 5 minutes', async () => {
    challengeCreate.mockResolvedValue({} as never)
    const before = Date.now()

    const result = await createChallenge({ address: ADDRESS, chain: CHAIN })

    const after = Date.now()
    expect(result.nonce).toEqual(expect.any(String))
    expect(result.message).toContain(`address: ${ADDRESS}`)
    expect(result.message).toContain(`nonce: ${result.nonce}`)
    // L'expiration est posée à `Date.now() + 5 min` DANS la fonction : elle
    // tombe donc forcément entre before+5min et after+5min.
    const FIVE_MINUTES = 5 * 60_000
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(before + FIVE_MINUTES)
    expect(result.expiresAt.getTime()).toBeLessThanOrEqual(after + FIVE_MINUTES)
  })

  it('persiste le challenge avec exactement le message qui devra être signé', async () => {
    challengeCreate.mockResolvedValue({} as never)

    const result = await createChallenge({ address: ADDRESS, chain: CHAIN })

    // Le message stocké est la seule référence contre laquelle la signature
    // sera vérifiée : s'il diverge de celui renvoyé au wallet, plus personne
    // ne peut se connecter.
    expect(challengeCreate).toHaveBeenCalledWith({
      data: { address: ADDRESS, chain: CHAIN, nonce: result.nonce, message: result.message, expiresAt: result.expiresAt },
    })
  })

  it('génère un nonce différent à chaque appel (non rejouable)', async () => {
    challengeCreate.mockResolvedValue({} as never)

    const first = await createChallenge({ address: ADDRESS, chain: CHAIN })
    const second = await createChallenge({ address: ADDRESS, chain: CHAIN })

    expect(first.nonce).not.toBe(second.nonce)
  })

  it('rejette une demande sans adresse avant tout accès à la base', async () => {
    await expect(createChallenge({ address: '', chain: CHAIN })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    })
    expect(challengeCreate).not.toHaveBeenCalled()
  })

  it('refuse une chaîne non supportée plutôt que d\'émettre un challenge invérifiable', async () => {
    // Doublure qui lève : c'est le comportement réel de getChainVerifier pour
    // une chaîne inconnue.
    chainVerifier.mockImplementation(() => {
      throw Object.assign(new Error('Chaîne non supportée'), { status: 400, code: 'UNSUPPORTED_CHAIN' })
    })

    await expect(createChallenge({ address: ADDRESS, chain: 'bitcoin' })).rejects.toMatchObject({
      code: 'UNSUPPORTED_CHAIN',
    })
    expect(challengeCreate).not.toHaveBeenCalled()
  })
})

describe('verifyChallenge : vérification de la signature', () => {
  it('vérifie la signature contre le message STOCKÉ, pas contre une donnée du client', async () => {
    challengeFindUnique.mockResolvedValue(storedChallenge() as never)
    walletFindUnique.mockResolvedValue({
      userId: 'user-1',
      user: { id: 'user-1', username: 'alice', deletedAt: null, isBanned: false, twoFactorEnabled: false, role: { name: 'user' } },
    } as never)

    await verifyChallenge(validInput(), null)

    // Le cœur de la sécurité du login : si le message vérifié venait du client,
    // n'importe qui pourrait signer un message de son choix.
    expect(verifySignature).toHaveBeenCalledWith({
      address: ADDRESS,
      publicKey: PUBLIC_KEY,
      signature: SIGNATURE,
      message: CHALLENGE_MESSAGE,
    })
  })

  it('consomme le nonce après une signature valide (anti-rejeu)', async () => {
    challengeFindUnique.mockResolvedValue(storedChallenge() as never)
    walletFindUnique.mockResolvedValue({
      userId: 'user-1',
      user: { id: 'user-1', username: 'alice', deletedAt: null, isBanned: false, twoFactorEnabled: false, role: { name: 'user' } },
    } as never)

    await verifyChallenge(validInput(), null)

    expect(challengeUpdate).toHaveBeenCalledWith({
      where: { id: 'challenge-1' },
      data: { consumedAt: expect.any(Date) },
    })
  })

  it('rejette une signature invalide en 401 et ne consomme pas le challenge', async () => {
    challengeFindUnique.mockResolvedValue(storedChallenge() as never)
    verifySignature.mockReturnValue(false)

    await expect(verifyChallenge(validInput(), null)).rejects.toMatchObject({
      status: 401,
      code: 'INVALID_SIGNATURE',
    })
    expect(challengeUpdate).not.toHaveBeenCalled()
  })

  it('rejette un champ manquant avant toute lecture en base', async () => {
    await expect(verifyChallenge(validInput({ signature: '' }), null)).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
    })
    expect(challengeFindUnique).not.toHaveBeenCalled()
  })
})

describe('verifyChallenge : robustesse du challenge (cas aux limites)', () => {
  it('rejette un nonce inconnu', async () => {
    challengeFindUnique.mockResolvedValue(null)
    await expect(verifyChallenge(validInput(), null)).rejects.toMatchObject({ code: 'CHALLENGE_INVALID' })
  })

  it('rejette un challenge émis pour une AUTRE adresse', async () => {
    challengeFindUnique.mockResolvedValue(storedChallenge({ address: 'rBobWallet' }) as never)
    await expect(verifyChallenge(validInput(), null)).rejects.toMatchObject({ code: 'CHALLENGE_INVALID' })
    expect(verifySignature).not.toHaveBeenCalled()
  })

  it('rejette un challenge émis pour une AUTRE chaîne', async () => {
    challengeFindUnique.mockResolvedValue(storedChallenge({ chain: 'ethereum' }) as never)
    await expect(verifyChallenge(validInput(), null)).rejects.toMatchObject({ code: 'CHALLENGE_INVALID' })
  })

  it('rejette un challenge déjà consommé (rejeu d\'une signature valide)', async () => {
    challengeFindUnique.mockResolvedValue(storedChallenge({ consumedAt: new Date() }) as never)
    await expect(verifyChallenge(validInput(), null)).rejects.toMatchObject({ code: 'CHALLENGE_INVALID' })
    expect(verifySignature).not.toHaveBeenCalled()
  })

  it('accepte un challenge dont l\'expiration est dans 1 ms (borne inférieure)', async () => {
    challengeFindUnique.mockResolvedValue(storedChallenge({ expiresAt: new Date(Date.now() + 1000) }) as never)
    walletFindUnique.mockResolvedValue({
      userId: 'user-1',
      user: { id: 'user-1', username: 'alice', deletedAt: null, isBanned: false, twoFactorEnabled: false, role: { name: 'user' } },
    } as never)

    await expect(verifyChallenge(validInput(), null)).resolves.toMatchObject({ mode: 'authenticated' })
  })

  it('rejette un challenge expiré depuis 1 ms (borne supérieure)', async () => {
    challengeFindUnique.mockResolvedValue(storedChallenge({ expiresAt: new Date(Date.now() - 1) }) as never)

    await expect(verifyChallenge(validInput(), null)).rejects.toMatchObject({
      status: 400,
      code: 'CHALLENGE_EXPIRED',
    })
    expect(verifySignature).not.toHaveBeenCalled()
  })
})

describe('verifyChallenge : connexion et inscription', () => {
  it('ouvre une session pour un wallet déjà connu', async () => {
    challengeFindUnique.mockResolvedValue(storedChallenge() as never)
    walletFindUnique.mockResolvedValue({
      userId: 'user-1',
      user: { id: 'user-1', username: 'alice', deletedAt: null, isBanned: false, twoFactorEnabled: false, role: { name: 'user' } },
    } as never)

    const result = await verifyChallenge(validInput(), null)

    expect(result).toMatchObject({ mode: 'authenticated', isNewAccount: false })
    expect(userCreate).not.toHaveBeenCalled()
    // Le jeton d'accès porte bien l'identifiant du compte.
    expect(verifyToken((result as { accessToken: string }).accessToken)?.sub).toBe('user-1')
  })

  it('crée le compte à la volée pour un wallet inconnu : la signature EST l\'inscription', async () => {
    challengeFindUnique.mockResolvedValue(storedChallenge() as never)
    walletFindUnique.mockResolvedValue(null)
    userCreate.mockResolvedValue({
      id: 'user-new',
      username: null,
      deletedAt: null,
      isBanned: false,
      twoFactorEnabled: false,
      role: { name: 'user' },
    } as never)

    const result = await verifyChallenge(validInput(), null)

    expect(result).toMatchObject({ mode: 'authenticated', isNewAccount: true })
    // Le wallet est créé dans la foulée et devient le wallet principal.
    expect(userCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          wallets: { create: { address: ADDRESS, chain: CHAIN, isPrimary: true } },
        }),
      }),
    )
  })

  it('refuse la connexion d\'un compte supprimé', async () => {
    challengeFindUnique.mockResolvedValue(storedChallenge() as never)
    walletFindUnique.mockResolvedValue({
      userId: 'user-1',
      user: { id: 'user-1', deletedAt: new Date(), isBanned: false, role: { name: 'user' } },
    } as never)

    await expect(verifyChallenge(validInput(), null)).rejects.toMatchObject({ status: 401, code: 'AUTH_REQUIRED' })
  })

  it('refuse la connexion d\'un compte banni', async () => {
    challengeFindUnique.mockResolvedValue(storedChallenge() as never)
    walletFindUnique.mockResolvedValue({
      userId: 'user-1',
      user: { id: 'user-1', deletedAt: null, isBanned: true, role: { name: 'user' } },
    } as never)

    await expect(verifyChallenge(validInput(), null)).rejects.toMatchObject({ status: 403, code: 'USER_BANNED' })
  })
})

describe('verifyChallenge : second facteur', () => {
  it('n\'ouvre PAS de session quand la 2FA est active : seulement un jeton en attente', async () => {
    challengeFindUnique.mockResolvedValue(storedChallenge() as never)
    walletFindUnique.mockResolvedValue({
      userId: 'user-1',
      user: { id: 'user-1', username: 'alice', deletedAt: null, isBanned: false, twoFactorEnabled: true, role: { name: 'user' } },
    } as never)

    const result = await verifyChallenge(validInput(), null)

    expect(result).toMatchObject({ mode: 'totp_required', requires2FA: true })
    // Le point critique : aucun jeton d'accès n'est délivré tant que le second
    // facteur n'a pas été fourni.
    expect(result).not.toHaveProperty('accessToken')
    // Et le jeton en attente est bien typé '2fa' : le middleware d'auth le
    // rejette donc comme session (cf. auth.middleware.ts).
    expect(verifyToken((result as { pendingToken: string }).pendingToken)?.type).toBe('2fa')
  })
})

describe('verifyChallenge : rattachement d\'un wallet à une session existante', () => {
  it('rattache un nouveau wallet au compte connecté au lieu de connecter', async () => {
    challengeFindUnique.mockResolvedValue(storedChallenge() as never)
    walletFindUnique.mockResolvedValue(null)
    walletFindFirst.mockResolvedValue(null)
    walletCreate.mockResolvedValue({} as never)

    const result = await verifyChallenge(validInput(), 'user-1')

    expect(result).toEqual({ mode: 'linked' })
    // Premier wallet du compte → il devient principal.
    expect(walletCreate).toHaveBeenCalledWith({
      data: { userId: 'user-1', address: ADDRESS, chain: CHAIN, isPrimary: true },
    })
  })

  it('ne promeut pas en principal un wallet ajouté alors qu\'il en existe déjà un', async () => {
    challengeFindUnique.mockResolvedValue(storedChallenge() as never)
    walletFindUnique.mockResolvedValue(null)
    walletFindFirst.mockResolvedValue({ id: 'wallet-existing' } as never)
    walletCreate.mockResolvedValue({} as never)

    await verifyChallenge(validInput(), 'user-1')

    expect(walletCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isPrimary: false }) }),
    )
  })

  it('refuse de voler un wallet déjà rattaché à un autre compte', async () => {
    challengeFindUnique.mockResolvedValue(storedChallenge() as never)
    walletFindUnique.mockResolvedValue({ userId: 'someone-else', user: {} } as never)

    await expect(verifyChallenge(validInput(), 'user-1')).rejects.toMatchObject({
      status: 409,
      code: 'WALLET_ALREADY_LINKED',
    })
    expect(walletCreate).not.toHaveBeenCalled()
  })

  it('est idempotent si le wallet est déjà rattaché à ce même compte', async () => {
    challengeFindUnique.mockResolvedValue(storedChallenge() as never)
    walletFindUnique.mockResolvedValue({ userId: 'user-1', user: {} } as never)

    await expect(verifyChallenge(validInput(), 'user-1')).resolves.toEqual({ mode: 'linked' })
    expect(walletCreate).not.toHaveBeenCalled()
  })
})

describe('verifyChallenge : amorçage de l\'administrateur', () => {
  it('promeut le compte en admin quand l\'adresse est celle de ADMIN_WALLET_ADDRESS', async () => {
    vi.stubEnv('ADMIN_WALLET_ADDRESS', ADDRESS)
    challengeFindUnique.mockResolvedValue(storedChallenge() as never)
    walletFindUnique.mockResolvedValue({
      userId: 'user-1',
      user: { id: 'user-1', username: 'alice', deletedAt: null, isBanned: false, twoFactorEnabled: false, role: { name: 'user' } },
    } as never)
    roleFindFirst.mockResolvedValue({ id: 9, name: 'admin' } as never)
    userUpdate.mockResolvedValue({
      id: 'user-1',
      username: 'alice',
      role: { name: 'admin' },
    } as never)

    const result = await verifyChallenge(validInput(), null)

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { roleId: 9 },
      include: { role: true },
    })
    expect(result).toMatchObject({ user: { role: 'admin' } })
  })

  it('ne promeut personne quand ADMIN_WALLET_ADDRESS n\'est pas défini', async () => {
    challengeFindUnique.mockResolvedValue(storedChallenge() as never)
    walletFindUnique.mockResolvedValue({
      userId: 'user-1',
      user: { id: 'user-1', username: 'alice', deletedAt: null, isBanned: false, twoFactorEnabled: false, role: { name: 'user' } },
    } as never)

    await verifyChallenge(validInput(), null)

    expect(userUpdate).not.toHaveBeenCalled()
  })

  it('ne promeut pas un compte dont l\'adresse ne correspond pas à celle de l\'admin', async () => {
    vi.stubEnv('ADMIN_WALLET_ADDRESS', 'rSomeOtherAdmin')
    challengeFindUnique.mockResolvedValue(storedChallenge() as never)
    walletFindUnique.mockResolvedValue({
      userId: 'user-1',
      user: { id: 'user-1', username: 'alice', deletedAt: null, isBanned: false, twoFactorEnabled: false, role: { name: 'user' } },
    } as never)

    await verifyChallenge(validInput(), null)

    expect(userUpdate).not.toHaveBeenCalled()
  })
})
