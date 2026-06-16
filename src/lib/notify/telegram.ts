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

export async function notifyTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) return // desligado até as envs existirem
  try {
    await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.length > 4000 ? text.slice(0, 3990) + '…' : text, // limite Telegram = 4096
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(5000),
    })
  } catch (err) {
    console.error('[telegram] falha ao enviar:', err instanceof Error ? err.message : String(err))
  }
}
