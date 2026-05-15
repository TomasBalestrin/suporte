/**
 * Δ13 (Luz Estrela code review) — extrair `computeHealthStatus` da
 * duplicação entre health/route.ts e cron/kb-health-check/route.ts.
 *
 * Source-of-truth único pra threshold de degraded/critical. Mudanças
 * de regra acontecem aqui só.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type HealthStatus = 'healthy' | 'degraded' | 'critical'

export interface KbHealthMetrics {
  total: number
  nullEmbedding: number
  fromVault: number
  lastSuccessfulSync: string | null
  hoursSinceLastSync: number | null
  healthStatus: HealthStatus
}

const DEGRADED_HOURS = 24
const CRITICAL_HOURS = 72

/**
 * Computa status de saúde da KB com base nas contagens + idade da última sync.
 *
 *  - healthy:  0 NULL embeddings AND sync <24h
 *  - degraded: algum NULL OR sync 24-72h
 *  - critical: todos NULL OR sync >72h OR total=0
 */
export function computeHealthStatus(
  total: number,
  nullCount: number,
  hoursSinceSync: number,
): HealthStatus {
  if (total === 0) return 'critical'
  if (nullCount === total) return 'critical'
  if (hoursSinceSync > CRITICAL_HOURS) return 'critical'
  if (nullCount > 0 || hoursSinceSync > DEGRADED_HOURS) return 'degraded'
  return 'healthy'
}

/**
 * Coleta as métricas direto do Supabase. Use o `admin` client (service role)
 * pra contornar RLS — o caller já validou auth do operador.
 */
export async function collectKbHealthMetrics(admin: SupabaseClient): Promise<KbHealthMetrics> {
  const { count: totalActive } = await admin
    .from('knowledge_base')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)

  const { count: nullEmbedding } = await admin
    .from('knowledge_base')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .is('embedding', null)

  const { count: fromVault } = await admin
    .from('knowledge_base')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .not('slug', 'is', null)

  const { data: lastSyncRow } = await admin
    .from('knowledge_base')
    .select('updated_at')
    .not('slug', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const total = totalActive ?? 0
  const nullCount = nullEmbedding ?? 0
  const vaultCount = fromVault ?? 0
  const lastSync = lastSyncRow?.updated_at ?? null
  const hoursSinceSync = lastSync
    ? (Date.now() - new Date(lastSync).getTime()) / 1000 / 60 / 60
    : Infinity

  return {
    total,
    nullEmbedding: nullCount,
    fromVault: vaultCount,
    lastSuccessfulSync: lastSync,
    hoursSinceLastSync: lastSync ? Number(hoursSinceSync.toFixed(2)) : null,
    healthStatus: computeHealthStatus(total, nullCount, hoursSinceSync),
  }
}
