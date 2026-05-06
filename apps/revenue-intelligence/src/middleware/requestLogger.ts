import { Request, Response, NextFunction } from 'express'

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now()
  res.on('finish', () => {
    console.log('[req]', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Date.now() - start,
    })
  })
  next()
}
