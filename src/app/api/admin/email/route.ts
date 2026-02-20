import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/send'
import { isAdmin } from '@/lib/supabase/guards'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }

    const admin = createAdminClient()
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = 20
    const offset = (page - 1) * limit

    // Recent notification logs
    const { data: logs, count } = await admin
      .from('notification_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Stats
    const { count: totalSent } = await admin
      .from('notification_log')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent')

    const { count: totalFailed } = await admin
      .from('notification_log')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed')

    const { count: last24h } = await admin
      .from('notification_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 86400000).toISOString())

    return NextResponse.json({
      success: true,
      data: {
        logs: logs || [],
        total: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
        stats: {
          totalSent: totalSent || 0,
          totalFailed: totalFailed || 0,
          last24h: last24h || 0,
          resendConfigured: !!process.env.RESEND_API_KEY,
          emailFrom: process.env.EMAIL_FROM || 'noreply@bethelsystems.com.br',
        },
      },
    })
  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar logs de email' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ success: false, error: 'Nao autorizado' }, { status: 401 })
    }

    if (!(await isAdmin(user.id))) {
      return NextResponse.json({ success: false, error: 'Apenas admins podem enviar emails de teste' }, { status: 403 })
    }

    const body = await request.json()
    const { to } = body

    if (!to) {
      return NextResponse.json(
        { success: false, error: 'Email de destino obrigatorio' },
        { status: 400 }
      )
    }

    const result = await sendEmail({
      to,
      subject: 'Teste de Email - Bethel Suporte',
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0A0A0B; color: #E4E4E7;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #00B8D9; font-size: 24px; margin: 0;">Bethel Suporte</h1>
    </div>
    <div style="background-color: #18181B; border: 1px solid #27272A; border-radius: 12px; padding: 24px; margin: 16px 0;">
      <h2 style="color: #22C55E; margin: 0 0 16px;">Email de Teste</h2>
      <p>Este e um email de teste enviado pelo painel administrativo do Bethel Suporte.</p>
      <p style="color: #A1A1AA; font-size: 14px;">Se voce recebeu este email, a configuracao de email esta funcionando corretamente.</p>
    </div>
    <div style="color: #71717A; font-size: 12px; text-align: center; padding: 24px 0; border-top: 1px solid #27272A; margin-top: 32px;">
      <p>Bethel Suporte &copy; ${new Date().getFullYear()}</p>
    </div>
  </div>
</body>
</html>`,
      template: 'test',
    })

    if (result) {
      return NextResponse.json({ success: true, message: 'Email de teste enviado' })
    } else {
      return NextResponse.json(
        { success: false, error: 'Falha ao enviar. Verifique a configuracao do Resend.' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao enviar email de teste' },
      { status: 500 }
    )
  }
}
