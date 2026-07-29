/**
 * D-P3 (Trem-Bala perf) — singleton OpenAI client.
 *
 * Antes: `(await import('openai')).default` rodava em CADA request handler que
 * usa OpenAI (chat, ai-suggest, kb-search, regenerate-embedding) — ~50-100ms
 * de cold start no primeiro request de cada worker Vercel.
 *
 * Agora: 1 instância por process. Tipos vêm via dynamic import preservando
 * lazy load (não impacta cold start de outros code paths).
 */

import type OpenAIType from 'openai'

let cachedClient: OpenAIType | null = null

export async function getOpenAIClient(): Promise<OpenAIType> {
  if (cachedClient) return cachedClient
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured')
  }
  const OpenAI = (await import('openai')).default
  cachedClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return cachedClient
}
