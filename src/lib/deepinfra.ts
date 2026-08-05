/**
 * DeepInfra — endpoint OpenAI-compatible. Migração de 2026-07-27: mesmo motivo e mesmo
 * modelo do Fluxon (OpenAI com histórico de insufficient_quota). Cobre só chat completions
 * (com tool calling) — embeddings da base de conhecimento continuam na OpenAI por ora, pois
 * as 133 artigos já têm embedding gerado com text-embedding-3-small e trocar de provider
 * sem regenerar quebraria a busca semântica.
 */
let _deepinfra: import('openai').default | null = null

export async function getDeepInfra() {
  if (_deepinfra) return _deepinfra
  const apiKey = process.env.DEEPINFRA_API_KEY
  if (!apiKey) throw new Error('DEEPINFRA_API_KEY ausente')
  const OpenAI = (await import('openai')).default
  _deepinfra = new OpenAI({ apiKey, baseURL: 'https://api.deepinfra.com/v1/openai' })
  return _deepinfra
}

export const SOFIA_LLM_MODEL = 'meta-llama/Llama-3.3-70B-Instruct-Turbo'
