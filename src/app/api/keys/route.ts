import keytar from 'keytar'
import type { NextRequest } from 'next/server'

const SERVICE_NAME = 'multi-model-arena'

/**
 * Helper for server-side code to retrieve the actual API key value.
 * Never exposed via the HTTP API.
 */
export async function getApiKey(providerId: string): Promise<string | null> {
  return keytar.getPassword(SERVICE_NAME, providerId)
}

/**
 * GET /api/keys?providerId=xxx
 * Returns { hasKey: true/false } — never the actual key value.
 */
export async function GET(request: NextRequest) {
  const providerId = request.nextUrl.searchParams.get('providerId')

  if (!providerId) {
    return Response.json({ error: 'providerId query param is required' }, { status: 400 })
  }

  const key = await keytar.getPassword(SERVICE_NAME, providerId)
  return Response.json({ hasKey: key !== null })
}

/**
 * PUT /api/keys
 * Body: { providerId, apiKey }
 * Stores the key in the system keychain.
 */
export async function PUT(request: NextRequest) {
  let body: { providerId?: string; apiKey?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { providerId, apiKey } = body

  if (!providerId || !apiKey) {
    return Response.json({ error: 'providerId and apiKey are required' }, { status: 400 })
  }

  await keytar.setPassword(SERVICE_NAME, providerId, apiKey)
  return Response.json({ success: true })
}

/**
 * DELETE /api/keys
 * Body: { providerId }
 * Removes the key from the system keychain.
 */
export async function DELETE(request: NextRequest) {
  let body: { providerId?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { providerId } = body

  if (!providerId) {
    return Response.json({ error: 'providerId is required' }, { status: 400 })
  }

  const deleted = await keytar.deletePassword(SERVICE_NAME, providerId)
  if (!deleted) {
    return Response.json({ error: 'Key not found' }, { status: 404 })
  }

  return Response.json({ success: true })
}
