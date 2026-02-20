import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatDateShort,
  formatPhone,
  phoneMask,
  formatMinutesToHuman,
} from '../utils/format'

describe('formatDate', () => {
  it('formats ISO date string', () => {
    const result = formatDate('2024-06-15T14:30:00Z')
    expect(result).toMatch(/15\/06\/2024/)
  })

  it('formats Date object', () => {
    const result = formatDate(new Date('2024-01-01T10:00:00Z'))
    expect(result).toMatch(/01\/01\/2024/)
  })

  it('handles invalid date string gracefully', () => {
    const result = formatDate('not-a-date')
    // Should not throw, returns formatted current date as fallback
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })
})

describe('formatDateShort', () => {
  it('formats ISO date without time', () => {
    const result = formatDateShort('2024-12-25T00:00:00Z')
    expect(result).toBe('25/12/2024')
  })
})

describe('formatPhone', () => {
  it('formats 11-digit phone (mobile)', () => {
    expect(formatPhone('11987654321')).toBe('(11) 98765-4321')
  })

  it('formats 10-digit phone (landline)', () => {
    expect(formatPhone('1134567890')).toBe('(11) 3456-7890')
  })

  it('strips non-numeric characters before formatting', () => {
    expect(formatPhone('(11) 98765-4321')).toBe('(11) 98765-4321')
  })

  it('returns original for other lengths', () => {
    expect(formatPhone('123')).toBe('123')
  })
})

describe('phoneMask', () => {
  it('returns digits only for 1-2 chars', () => {
    expect(phoneMask('11')).toBe('11')
  })

  it('adds area code parentheses for 3-7 chars', () => {
    expect(phoneMask('11987')).toBe('(11) 987')
  })

  it('formats full mobile number', () => {
    expect(phoneMask('11987654321')).toBe('(11) 98765-4321')
  })

  it('truncates input beyond 11 digits', () => {
    expect(phoneMask('119876543219999')).toBe('(11) 98765-4321')
  })
})

describe('formatMinutesToHuman', () => {
  it('shows minutes for < 60', () => {
    expect(formatMinutesToHuman(30)).toBe('30min')
  })

  it('shows hours for exactly 60', () => {
    expect(formatMinutesToHuman(60)).toBe('1h')
  })

  it('shows hours and minutes', () => {
    expect(formatMinutesToHuman(90)).toBe('1h 30min')
  })

  it('shows days for 24h+', () => {
    expect(formatMinutesToHuman(1440)).toBe('1d')
  })

  it('shows days and hours', () => {
    expect(formatMinutesToHuman(1500)).toBe('1d 1h')
  })

  it('shows only hours when no remaining minutes', () => {
    expect(formatMinutesToHuman(120)).toBe('2h')
  })
})
