import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { v1Router } from './routes/v1'
import { errorHandler } from './middlewares/error-handler'

export function createApp() {
  const app = express()

  // Behind the VPS reverse-proxy and the Nitro /api proxy: read the client IP
  // from the leftmost X-Forwarded-For entry so per-IP rate limits don't lump
  // every visitor behind the proxies' address. Spoofable by a crafted header,
  // which is acceptable for abuse mitigation (never used as an auth boundary).
  app.set('trust proxy', true)

  app.use(helmet())

  // Les jetons voyagent en cookies httpOnly : un navigateur ne les envoie (ni
  // ne les enregistre) sur une requête cross-origin que si le serveur autorise
  // explicitement les credentials — d'où `credentials: true`.
  //
  // En production aucune origine navigateur n'est autorisée, parce qu'aucune
  // n'en a besoin : l'API n'est pas exposée, seul le proxy Nitro du front
  // l'appelle en server-to-server (sans en-tête Origin, donc hors CORS).
  // En développement le front tape l'API directement (:8080 → :3000) : on
  // reflète l'origine appelante pour ne rien avoir à configurer.
  //
  // Si un jour un client navigateur externe doit joindre l'API (front sur un
  // autre domaine, webapp mobile), c'est ici qu'il faut ajouter sa liste
  // d'origines — volontairement pas de variable d'environnement tant que ce
  // besoin n'existe pas.
  app.use(cors({ origin: process.env.NODE_ENV !== 'production', credentials: true }))
  app.use(cookieParser())
  app.use(express.json())

  app.use('/api/v1', v1Router)

  // Unknown route → JSON 404 (API contract, not HTML).
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Not Found', details: {} } })
  })

  app.use(errorHandler)

  return app
}
