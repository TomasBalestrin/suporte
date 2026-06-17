/**
 * notifyTelegram — encaminha conteúdo do suporte pro Telegram do dono (Eduardo).
 * Espelha o padrão do sendEmail: NON-BLOCKING e nunca lança (engole o erro), pra
 * uma falha do Telegram nunca quebrar criação de ticket / resposta da Sofia.
 *
 * Inerte por padrão: se TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID não estiverem no
 * ambiente, é no-op (a feature liga só quando o dono setar as envs no Vercel).
 *
 * PII: o destino é o chat PRIVADO do dono — ver dado de cliente ali é o objetivo.
 * Texto plano (sem parse_mode) pra conteúdo do cliente nunca quebrar a API com
 * caracteres especiais de markdown.
 */
const TELEGRAM_API = 'https://api.telegram.org'

export interface NotifyOptions {
  /**
   * Anexa o botão inline "👁 Ver conversa" → callback_data `view:<ticketId>`.
   * O webhook (sob demanda) puxa as últimas msgs do ticket pro Telegram. PII só
   * viaja quando o dono TOCA o botão (decisão do dono: ver conversa sob demanda).
   */
  viewTicketId?: string
}

export async function notifyTelegram(text: string, opts: NotifyOptions = {}): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return // desligado até as envs existirem
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: text.length > 4000 ? text.slice(0, 3990) + '…' : text, // limite Telegram = 4096
    disable_web_page_preview: true,
  }
  if (opts.viewTicketId) {
    body.reply_markup = { inline_keyboard: [[{ text: '👁 Ver conversa', callback_data: `view:${opts.viewTicketId}` }]] }
  }
  try {
    await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    })
  } catch (err) {
    console.error('[telegram] falha ao enviar:', err instanceof Error ? err.message : String(err))
  }
}
