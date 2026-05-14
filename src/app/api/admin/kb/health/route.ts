import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isAgentOrAdmin } from '@/lib/supabase/guards'

/**
 * PR-2 (A Lenda) — health endpoint da knowledge base.
 *
 * Métricas:
 * - articles_with_null_embedding  → artigos no banco sem embedding (RAG ignora)
 * - total_articles                → total de artigos ativos
 * - articles_from_vault           → artigos com slug (pipeline sync-kb gerencia)
 * - last_successful_sync          → MAX(updated_at) onde slug IS NOT NULL
 *
 * health_status:
 *   - healthy    → 0 NULL embeddings
 *   - degraded   → algum NULL OU last_sync > 24h atrás (e há slug)
 *   - critical   → todos NULL OU last_sync > 72h
 *
 * Usado por: dashboard /admin/knowledge-base + cron de alerta (PR-2 parte 2).
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }
    if (!(await isAgentOrAdmin(user.id))) {
      return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 })
    }

    const admin = createAdminClient()

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
    const lastSuccessfulSync = lastSyncRow?.updated_at ?? null

    const now = Date.now()
    const hoursSinceSync = lastSuccessfulSync
      ? (now - new Date(lastSuccessfulSync).getTime()) / 1000 / 60 / 60
      : Infinity

    let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy'
    if (total === 0) {
      healthStatus = 'critical'
    } else if (nullCount === total) {
      healthStatus = 'critical'
    } else if (hoursSinceSync > 72) {
      healthStatus = 'critical'
    } else if (nullCount > 0 || hoursSinceSync > 24) {
      healthStatus = 'degraded'
    }

    return NextResponse.json({
      success: true,
      data: {
        articles_with_null_embedding: nullCount,
        total_articles: total,
        articles_from_vault: vaultCount,
        articles_legacy_no_slug: total - vaultCount,
        last_successful_sync: lastSuccessfulSync,
        hours_since_last_sync: lastSuccessfulSync ? Number(hoursSinceSync.toFixed(2)) : null,
        health_status: healthStatus,
      },
    })
  } catch (error) {
    console.error('KB health error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao consultar saude da KB' },
      { status: 500 }
    )
  }
}
