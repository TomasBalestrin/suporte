import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isAgentOrAdmin } from '@/lib/supabase/guards'
import { collectKbHealthMetrics } from '@/lib/kb-health'

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

    // Δ13 — lógica extraída pra lib/kb-health (shared com cron).
    const admin = createAdminClient()
    const m = await collectKbHealthMetrics(admin)

    return NextResponse.json({
      success: true,
      data: {
        articles_with_null_embedding: m.nullEmbedding,
        total_articles: m.total,
        articles_from_vault: m.fromVault,
        articles_legacy_no_slug: m.total - m.fromVault,
        last_successful_sync: m.lastSuccessfulSync,
        hours_since_last_sync: m.hoursSinceLastSync,
        health_status: m.healthStatus,
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
