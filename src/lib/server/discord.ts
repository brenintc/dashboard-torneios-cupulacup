import { createPublicKey, verify } from 'crypto'

const API = 'https://discord.com/api/v10'

export const PERM = {
  VIEW: BigInt(1024),
  SEND: BigInt(2048),
  HISTORY: BigInt(65536),
  MANAGE_CHANNELS: BigInt(16),
}

export async function discord<T = unknown>(path: string, init: RequestInit = {}): Promise<T | null> {
  const res = await fetch(API + path, {
    ...init,
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`Discord ${res.status}: ${await res.text()}`)
  return res.status === 204 ? null : ((await res.json()) as T)
}

/** Confere a assinatura Ed25519 que o Discord envia em toda interação. */
export function assinaturaValida(corpo: string, assinatura: string | null, timestamp: string | null): boolean {
  const chave = process.env.DISCORD_PUBLIC_KEY
  if (!chave || !assinatura || !timestamp) return false
  try {
    const key = createPublicKey({
      key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(chave, 'hex')]),
      format: 'der',
      type: 'spki',
    })
    return verify(null, Buffer.from(timestamp + corpo), key, Buffer.from(assinatura, 'hex'))
  } catch {
    return false
  }
}
