import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@bethelsystems.com.br'

let _resend: Resend | null = null
function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  ticketId?: string
  template: string
}

export async function sendEmail({ to, subject, html, ticketId, template }: SendEmailOptions) {
  const resend = getResend()

  // Skip if Resend is not configured
  if (!resend) {
    console.log(`[Email] Resend not configured. Would send "${subject}" to ${to}`)
    return null
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `Bethel Suporte <${EMAIL_FROM}>`,
      to,
      subject,
      html,
    })

    if (error) throw error

    // Log notification
    const supabase = createAdminClient()
    await supabase.from('notification_log').insert({
      ticket_id: ticketId || null,
      recipient_email: to,
      subject,
      template,
      status: 'sent',
      resend_id: data?.id || null,
    })

    return data
  } catch (error) {
    // Log failed notification
    try {
      const supabase = createAdminClient()
      await supabase.from('notification_log').insert({
        ticket_id: ticketId || null,
        recipient_email: to,
        subject,
        template,
        status: 'failed',
      })
    } catch {
      // Ignore logging errors
    }

    console.error('[Email] Failed to send:', error)
    return null
  }
}
