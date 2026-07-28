import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextFunction, Request, Response } from 'express'
import { MulterError } from 'multer'
import { errorHandler } from '../middlewares/error-handler'
import { AppError } from '../utils/http'

// Doublure de la réponse Express : status() est chaînable, json() capture le
// corps envoyé au client.
function fakeRes() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code
      return this
    },
    json(payload: unknown) {
      this.body = payload
      return this
    },
  }
  return res as unknown as Response & { statusCode: number, body: any }
}

const req = { method: 'POST', originalUrl: '/api/v1/orders/1/confirm' } as Request
const next = vi.fn() as NextFunction

let consoleError: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  // Le handler trace côté serveur : on espionne pour garder la sortie de test
  // propre ET pouvoir affirmer que la trace a bien lieu.
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  consoleError.mockRestore()
})

describe('errorHandler : AppError', () => {
  it('rend le statut, le code et le message portés par l\'AppError', () => {
    const res = fakeRes()

    errorHandler(new AppError(404, 'NOT_FOUND', 'Asset introuvable'), req, res, next)

    expect(res.statusCode).toBe(404)
    expect(res.body).toEqual({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Asset introuvable', details: {} },
    })
  })

  it('transmet les details quand ils sont fournis', () => {
    const res = fakeRes()

    errorHandler(new AppError(400, 'VALIDATION_ERROR', 'Champ invalide', { field: 'price' }), req, res, next)

    expect(res.body.error.details).toEqual({ field: 'price' })
  })

  it('remplace des details absents par un objet vide (contrat d\'API stable)', () => {
    const res = fakeRes()

    errorHandler(new AppError(409, 'ALREADY_TOKENIZED', 'Déjà tokenisé'), req, res, next)

    // Le front lit toujours error.details : jamais undefined.
    expect(res.body.error.details).toEqual({})
  })

  it('ne trace pas côté serveur une erreur client ordinaire (bruit inutile)', () => {
    errorHandler(new AppError(404, 'NOT_FOUND', 'Asset introuvable'), req, fakeRes(), next)

    expect(consoleError).not.toHaveBeenCalled()
  })

  it('trace côté serveur les échecs de vérification on-chain (préfixe TX_)', () => {
    errorHandler(new AppError(400, 'TX_WRONG_TAG', 'Mauvais tag'), req, fakeRes(), next)

    // Signal opérationnel : un paiement refusé doit laisser une trace, même en 400.
    expect(consoleError).toHaveBeenCalledOnce()
    expect(consoleError.mock.calls[0]?.[0]).toContain('TX_WRONG_TAG')
    expect(consoleError.mock.calls[0]?.[0]).toContain('/api/v1/orders/1/confirm')
  })

  it('trace côté serveur toute erreur 5xx', () => {
    errorHandler(new AppError(502, 'TX_LOOKUP_FAILED', 'RPC injoignable'), req, fakeRes(), next)

    expect(consoleError).toHaveBeenCalledOnce()
  })
})

describe('errorHandler : upload refusé par Multer', () => {
  it('traduit un fichier trop volumineux en 413 FILE_TOO_LARGE', () => {
    const res = fakeRes()

    errorHandler(new MulterError('LIMIT_FILE_SIZE', 'file'), req, res, next)

    expect(res.statusCode).toBe(413)
    expect(res.body.error.code).toBe('FILE_TOO_LARGE')
    expect(res.body.error.message).toContain('50 Mo')
  })

  it('traduit les autres refus Multer en 400 VALIDATION_ERROR', () => {
    const res = fakeRes()

    errorHandler(new MulterError('LIMIT_UNEXPECTED_FILE', 'avatar'), req, res, next)

    expect(res.statusCode).toBe(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })
})

describe('errorHandler : erreur inattendue', () => {
  it('renvoie un 500 générique', () => {
    const res = fakeRes()

    errorHandler(new TypeError("Cannot read properties of undefined"), req, res, next)

    expect(res.statusCode).toBe(500)
    expect(res.body).toEqual({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error', details: {} },
    })
  })

  it('ne divulgue au client ni le message interne ni la pile d\'appels', () => {
    const res = fakeRes()
    const leaky = new Error('connect ECONNREFUSED 10.0.0.5:5432, password=hunter2')

    errorHandler(leaky, req, res, next)

    const serialized = JSON.stringify(res.body)
    expect(serialized).not.toContain('hunter2')
    expect(serialized).not.toContain('ECONNREFUSED')
    expect(res.body.error).not.toHaveProperty('stack')
  })

  it('conserve malgré tout la trace serveur pour le diagnostic', () => {
    const boom = new Error('boom')

    errorHandler(boom, req, fakeRes(), next)

    expect(consoleError).toHaveBeenCalledWith(boom)
  })

  it('traite une valeur levée qui n\'est pas une Error (throw "string")', () => {
    const res = fakeRes()

    errorHandler('quelque chose a cassé', req, res, next)

    expect(res.statusCode).toBe(500)
    expect(res.body.error.code).toBe('INTERNAL_ERROR')
  })
})
