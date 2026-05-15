/**
 * D-P1 (Trem-Bala perf) — cache da tabela ai_config com TTL 5min.
 *
 * Antes: cada request da Sofia (`chat/route.ts`) lia `ai_config` do banco
 * (1 round-trip ~5-10ms). Com 50+ req/min vira ruído consistente — ai_config
 * muda 1x por semana no melhor caso.
 *
 * Agora: cache em-memória por worker Vercel, TTL 5min. Trade-off aceitável:
 * - Mudança de config demora <=5min pra propagar (vs imediato).
 * - Workers Vercel são serverless — cache não compartilha entre invocations,
 *   mas reaproveita warm starts dentro do mesmo container.
 */

import { createAdminClient } from '@/lib/supabase/admin'

const TTL_MS = 5 * 60 * 1000 // 5 minutos

let cache: { configMap: Record<string, string>; expiresAt: number } | null = null

export async function getAiConfigMap(force = false): Promise<Record<string, string>> {
  const now = Date.now()
  if (!force && cache && cache.expiresAt > now) {
    return cache.configMap
  }

  const admin = createAdminClient()
  const { data: configs, error } = await admin.from('ai_config').select('config_key, config_value')
  if (error) {
    // Se já tinha cache vencido, devolve ele em vez de lançar — degradação graceful.
    if (cache) return cache.configMap
    throw error
  }

  const configMap: Record<string, string> = {}
  configs?.forEach(c => {
    if (c.config_key) configMap[c.config_key] = c.config_value
  })

  cache = { configMap, expiresAt: now + TTL_MS }
  return configMap
}

export function clearAiConfigCache(): void {
  cache = null
}

/**
 * Lê uma chave específica do cache. Atalho conveniente para o caller comum.
 */
export async function getAiConfigValue(key: string): Promise<string | null> {
  const map = await getAiConfigMap()
  return map[key] ?? null
}
