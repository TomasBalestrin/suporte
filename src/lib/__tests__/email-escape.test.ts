import { describe, it, expect } from 'vitest'

// Import and test the escapeHtml function indirectly through template output
// Since escapeHtml is not exported, we test via the template functions
import { ticketCreatedCustomer, newMessageCustomer } from '../email/templates'

describe('email template XSS protection', () => {
  it('escapes HTML in customer name', () => {
    const result = ticketCreatedCustomer({
      customerName: '<script>alert("xss")</script>',
      ticketCode: 'TK-001',
      accessToken: 'abc123',
      title: 'Test',
    })

    expect(result.html).not.toContain('<script>')
    expect(result.html).toContain('&lt;script&gt;')
  })

  it('escapes HTML in ticket title', () => {
    const result = ticketCreatedCustomer({
      customerName: 'User',
      ticketCode: 'TK-001',
      accessToken: 'abc123',
      title: '<img onerror="alert(1)" src=x>',
    })

    expect(result.html).not.toContain('<img')
    expect(result.html).toContain('&lt;img')
  })

  it('escapes HTML in message preview', () => {
    const result = newMessageCustomer({
      customerName: 'User',
      ticketCode: 'TK-001',
      accessToken: 'abc123',
      senderName: 'Agent',
      preview: '"><script>alert(1)</script>',
    })

    expect(result.html).not.toContain('"><script>')
    expect(result.html).toContain('&quot;&gt;&lt;script&gt;')
  })

  it('encodes accessToken in URL', () => {
    const result = ticketCreatedCustomer({
      customerName: 'User',
      ticketCode: 'TK-001',
      accessToken: 'token with spaces/special&chars',
      title: 'Test',
    })

    expect(result.html).toContain(encodeURIComponent('token with spaces/special&chars'))
    expect(result.html).not.toContain('token with spaces/special&chars')
  })

  it('escapes quotes in customer name', () => {
    const result = ticketCreatedCustomer({
      customerName: 'O\'Brien "Bob"',
      ticketCode: 'TK-001',
      accessToken: 'abc123',
      title: 'Test',
    })

    expect(result.html).toContain('&#39;')
    expect(result.html).toContain('&quot;')
  })
})
