import { describe, it, expect } from 'vitest'
import { escapeIlike } from '../supabase/guards'

describe('escapeIlike', () => {
  it('escapes percent signs', () => {
    expect(escapeIlike('100%')).toBe('100\\%')
  })

  it('escapes underscores', () => {
    expect(escapeIlike('user_name')).toBe('user\\_name')
  })

  it('escapes backslashes', () => {
    expect(escapeIlike('path\\to')).toBe('path\\\\to')
  })

  it('escapes multiple special characters', () => {
    expect(escapeIlike('%_test\\%')).toBe('\\%\\_test\\\\\\%')
  })

  it('returns normal text unchanged', () => {
    expect(escapeIlike('hello world')).toBe('hello world')
  })

  it('handles empty string', () => {
    expect(escapeIlike('')).toBe('')
  })

  it('handles string with only special chars', () => {
    expect(escapeIlike('%%__')).toBe('\\%\\%\\_\\_')
  })
})
