import 'dotenv/config'
import { createApp } from './app'
import { prisma } from './services/prisma'

const port = Number(process.env.PORT) || 3000
const app = createApp()

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Actify API listening on http://0.0.0.0:${port}`)
})

// Graceful shutdown so Docker stops the container cleanly.
for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    server.close(async () => {
      await prisma.$disconnect()
      process.exit(0)
    })
  })
}
