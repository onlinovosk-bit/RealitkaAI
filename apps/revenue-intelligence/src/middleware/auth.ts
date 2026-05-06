import { Request, Response, NextFunction } from 'express'

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers['x-api-key'] ?? req.headers['authorization']?.replace('Bearer ', '')
  if (!key || key !== process.env.API_KEY) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Invalid or missing API key', code: 401 })
    return
  }
  next()
}

export function hubspotWebhookAuth(req: Request, res: Response, next: NextFunction): void {
  // HubSpot signs payloads with X-HubSpot-Signature-v3
  // Verification happens inside the route after body is available
  // This middleware just ensures the header exists
  const sig = req.headers['x-hubspot-signature-v3']
  if (!sig) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing HubSpot signature', code: 401 })
    return
  }
  next()
}
