import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { collectKbHealthMetrics } from '@/lib/kb-health'

/**
 * PR-2 Parte 2 (A Lenda) — cron diário de alerta de saúde da KB.
 *
 * Roda 1x/dia (configurar em vercel.json). Lê as mesmas métricas do
 * /api/admin/kb/health e dispara webhook Discord se health != "healthy".
 *
 * Auth: Vercel cron envia header `Authorization: Bearer ${CRON_SECRET}`.
 * Sem CRON_SECRET configurado, rejeita.
 */
export async function GET(request: NextRequest) {
  // Vercel cron auth
  const authHeader = request.headers.get('authorization')
  const expected = `Bearer ${process.env.CRON_SECRET}`
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
  }

  try {
    // Δ13 — lógica extraída pra lib/kb-health (shared com /api/admin/kb/health).
    const admin = createAdminClient()
    const m = await collectKbHealthMetrics(admin)
    const { total, nullEmbedding: nullCount, lastSuccessfulSync: lastSync, hoursSinceLastSync, healthStatus } = m
    const hoursSinceSync = hoursSinceLastSync ?? Infinity

    // Healthy → log + sai.
    if (healthStatus === 'healthy') {
      console.log(`[cron:kb-health-check] healthy — ${total} articles, last sync ${hoursSinceSync.toFixed(1)}h ago`)
      return NextResponse.json({ success: true, status: 'healthy', total, null_embeddings: nullCount })
    }

    // Não-healthy → Discord webhook (PR-1 mesmo canal).
    const webhook = process.env.KB_PIPELINE_ALERT_WEBHOOK
    if (webhook) {
      const color = healthStatus === 'critical' ? 0xdc2626 : 0xf59e0b
      const emoji = healthStatus === 'critical' ? '🚨' : '⚠️'
      const payload = {
        username: 'Sofia KB Health',
        embeds: [
          {
            title: `${emoji} KB ${healthStatus}`,
            color,
            fields: [
              { name: 'Artigos NULL embedding', value: `${nullCount} / ${total}`, inline: true },
              {
                name: 'Última sync',
                value: lastSync ? `${hoursSinceSync.toFixed(1)}h atrás` : 'nunca',
                inline: true,
              },
            ],
            timestamp: new Date().toISOString(),
            footer: { text: 'the-boys-harness · PR-2 cron diário' },
          },
        ],
      }
      try {
        await fetch(webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10_000),
        })
      } catch (err) {
        console.error('[cron:kb-health-check] discord alert failed:', err)
      }
    } else {
      console.warn('[cron:kb-health-check] KB_PIPELINE_ALERT_WEBHOOK not set — alert not sent')
    }

    return NextResponse.json({
      success: true,
      status: healthStatus,
      total,
      null_embeddings: nullCount,
      hours_since_sync: Number(hoursSinceSync.toFixed(2)),
    })
  } catch (error) {
    console.error('[cron:kb-health-check] error:', error)
    return NextResponse.json({ success: false, error: 'Erro no cron' }, { status: 500 })
  }
}
