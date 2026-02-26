import { NextRequest, NextResponse } from 'next/server'
import { checkSlaBreaches } from '@/lib/sla/monitor'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await checkSlaBreaches()

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('[Cron] SLA check error:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao verificar SLA' },
      { status: 500 }
    )
  }
}
