import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'

const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@bethelsystems.com.br'
const MAX_RETRIES = 3

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

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function sendEmail({ to, subject, html, ticketId, template }: SendEmailOptions) {
  const resend = getResend()

  // Skip if Resend is not configured
  if (!resend) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Email] Resend not configured. Would send "${subject}" to ${to}`)
    }
    return null
  }

  let lastError: unknown = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const { data, error } = await resend.emails.send({
        from: `Bethel Suporte <${EMAIL_FROM}>`,
        to,
        subject,
        html,
      })

      if (error) throw error

      // Log successful notification
      try {
        const supabase = createAdminClient()
        await supabase.from('notification_log').insert({
          ticket_id: ticketId || null,
          recipient_email: to,
          subject,
          template,
          status: 'sent',
          resend_id: data?.id || null,
        })
      } catch {
        // Ignore logging errors
      }

      return data
    } catch (error) {
      lastError = error
      if (attempt < MAX_RETRIES - 1) {
        // Exponential backoff: 1s, 2s, 4s
        await sleep(1000 * Math.pow(2, attempt))
      }
    }
  }

  // All retries failed — log the failure
  try {
    const supabase = createAdminClient()
    await supabase.from('notification_log').insert({
      ticket_id: ticketId || null,
      recipient_email: to,
      subject,
      template,
      status: 'failed',
      details: { error: lastError instanceof Error ? lastError.message : 'Unknown error', retries: MAX_RETRIES },
    })
  } catch {
    // Ignore logging errors
  }

  console.error(`[Email] Failed to send after ${MAX_RETRIES} attempts:`, lastError)
  return null
}
