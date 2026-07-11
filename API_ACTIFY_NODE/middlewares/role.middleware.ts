import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../services/prisma'
import { AppError } from '../utils/http'

// admin implicitly satisfies any lower role requirement.
export function requireRole(...allowed: string[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const user = await prisma.user.findUniqueOrThrow({
        where: { id: req.user!.id },
        include: { role: true },
      })

      if (user.role.name !== 'admin' && !allowed.includes(user.role.name)) {
        throw new AppError(403, 'FORBIDDEN', `Rôle requis : ${allowed.join(' ou ')}`)
      }

      next()
    } catch (err) {
      next(err)
    }
  }
}
