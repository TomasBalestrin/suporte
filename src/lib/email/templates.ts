import { APP_NAME, APP_URL } from '@/lib/utils/constants'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #0A0A0B;
  color: #E4E4E7;
`

const cardStyle = `
  background-color: #18181B;
  border: 1px solid #27272A;
  border-radius: 12px;
  padding: 24px;
  margin: 16px 0;
`

const buttonStyle = `
  display: inline-block;
  background-color: #00B8D9;
  color: #FFFFFF;
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
`

const footerStyle = `
  color: #71717A;
  font-size: 12px;
  text-align: center;
  padding: 24px 0;
  border-top: 1px solid #27272A;
  margin-top: 32px;
`

function layout(content: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="${baseStyle}">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #00B8D9; font-size: 24px; margin: 0;">${APP_NAME}</h1>
    </div>
    ${content}
    <div style="${footerStyle}">
      <p>${APP_NAME} &copy; ${new Date().getFullYear()}</p>
      <p>Este e um email automatico, por favor nao responda.</p>
    </div>
  </div>
</body>
</html>`
}

export function ticketCreatedCustomer(data: {
  customerName: string
  ticketCode: string
  accessToken: string
  title: string
}) {
  const trackUrl = `${APP_URL}/suporte/ticket/${encodeURIComponent(data.accessToken)}`
  return {
    subject: `[${data.ticketCode}] Ticket criado - ${APP_NAME}`,
    html: layout(`
      <div style="${cardStyle}">
        <h2 style="color: #FFFFFF; margin: 0 0 16px;">Ola, ${escapeHtml(data.customerName)}!</h2>
        <p>Seu ticket foi criado com sucesso. Nosso time ira analisar e responder o mais breve possivel.</p>
        <div style="background-color: #0A0A0B; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; font-size: 14px; color: #71717A;">Codigo do ticket</p>
          <p style="margin: 4px 0 0; font-size: 20px; font-weight: bold; color: #00B8D9; font-family: monospace;">${escapeHtml(data.ticketCode)}</p>
        </div>
        <p style="color: #A1A1AA; font-size: 14px;"><strong>Assunto:</strong> ${escapeHtml(data.title)}</p>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${trackUrl}" style="${buttonStyle}">Acompanhar Ticket</a>
        </div>
      </div>
    `),
  }
}

export function newMessageCustomer(data: {
  customerName: string
  ticketCode: string
  accessToken: string
  senderName: string
  preview: string
}) {
  const trackUrl = `${APP_URL}/suporte/ticket/${encodeURIComponent(data.accessToken)}`
  return {
    subject: `[${data.ticketCode}] Nova resposta - ${APP_NAME}`,
    html: layout(`
      <div style="${cardStyle}">
        <h2 style="color: #FFFFFF; margin: 0 0 16px;">Nova resposta no seu ticket</h2>
        <p>Ola, ${escapeHtml(data.customerName)}! Voce recebeu uma nova resposta no ticket <strong style="color: #00B8D9;">${escapeHtml(data.ticketCode)}</strong>.</p>
        <div style="background-color: #0A0A0B; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; font-size: 12px; color: #71717A;">${escapeHtml(data.senderName)}</p>
          <p style="margin: 8px 0 0; font-size: 14px; color: #E4E4E7;">${escapeHtml(data.preview)}</p>
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${trackUrl}" style="${buttonStyle}">Ver Conversa</a>
        </div>
      </div>
    `),
  }
}

export function ticketResolvedCustomer(data: {
  customerName: string
  ticketCode: string
  accessToken: string
}) {
  const trackUrl = `${APP_URL}/suporte/ticket/${encodeURIComponent(data.accessToken)}`
  return {
    subject: `[${data.ticketCode}] Ticket resolvido - ${APP_NAME}`,
    html: layout(`
      <div style="${cardStyle}">
        <h2 style="color: #22C55E; margin: 0 0 16px;">Ticket Resolvido</h2>
        <p>Ola, ${escapeHtml(data.customerName)}! Seu ticket <strong style="color: #00B8D9;">${escapeHtml(data.ticketCode)}</strong> foi marcado como resolvido.</p>
        <p>Se o problema persistir, voce pode reabrir o ticket respondendo pela pagina de acompanhamento.</p>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${trackUrl}" style="${buttonStyle}">Avaliar Atendimento</a>
        </div>
      </div>
    `),
  }
}

export function newTicketAgent(data: {
  agentName: string
  ticketCode: string
  ticketId: string
  customerName: string
  title: string
  priority: string
}) {
  const ticketUrl = `${APP_URL}/admin/tickets/${data.ticketId}`
  return {
    subject: `[${data.ticketCode}] Novo ticket atribuido - ${APP_NAME}`,
    html: layout(`
      <div style="${cardStyle}">
        <h2 style="color: #FFFFFF; margin: 0 0 16px;">Novo ticket atribuido a voce</h2>
        <p>Ola, ${escapeHtml(data.agentName)}! Um novo ticket foi atribuido a voce.</p>
        <div style="background-color: #0A0A0B; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0;"><strong style="color: #00B8D9;">${escapeHtml(data.ticketCode)}</strong></p>
          <p style="margin: 8px 0 4px; font-size: 14px;">${escapeHtml(data.title)}</p>
          <p style="margin: 0; font-size: 12px; color: #71717A;">Cliente: ${escapeHtml(data.customerName)} | Prioridade: ${escapeHtml(data.priority)}</p>
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${ticketUrl}" style="${buttonStyle}">Abrir Ticket</a>
        </div>
      </div>
    `),
  }
}

export function satisfactionReminder(data: {
  customerName: string
  ticketCode: string
  accessToken: string
}) {
  const trackUrl = `${APP_URL}/suporte/ticket/${encodeURIComponent(data.accessToken)}`
  return {
    subject: `[${data.ticketCode}] Como foi o atendimento? - ${APP_NAME}`,
    html: layout(`
      <div style="${cardStyle}">
        <h2 style="color: #FFFFFF; margin: 0 0 16px;">Nos ajude a melhorar!</h2>
        <p>Ola, ${escapeHtml(data.customerName)}! Seu ticket <strong style="color: #00B8D9;">${escapeHtml(data.ticketCode)}</strong> foi resolvido recentemente.</p>
        <p>Gostavamos de saber como foi sua experiencia. Sua avaliacao nos ajuda a melhorar o atendimento.</p>
        <div style="text-align: center; margin-top: 24px;">
          <a href="${trackUrl}" style="${buttonStyle}">Avaliar Atendimento</a>
        </div>
      </div>
    `),
  }
}
