import { describe, expect, it } from 'vitest'
import { sanitizeInput } from '../sanitize'

describe('sanitizeInput', () => {
  it('should remove HTML tags', () => {
    expect(sanitizeInput('<script>alert("xss")</script>hello')).toBe('hello')
    expect(sanitizeInput('<div>foo</div>')).toBe('foo')
  })

  it('should escape special characters', () => {
    expect(sanitizeInput('<')).toBe('&lt;')
    expect(sanitizeInput('>')).toBe('&gt;')
    expect(sanitizeInput('&')).toBe('&amp;')
    expect(sanitizeInput('"')).toBe('&quot;')
    expect(sanitizeInput("'")).toBe('&#039;')
  })

  it('should trim whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello')
    expect(sanitizeInput('\t\nhello\n\t')).toBe('hello')
  })

  it('should handle empty string', () => {
    expect(sanitizeInput('')).toBe('')
  })

  it('should handle non-string input', () => {
    expect(sanitizeInput(null as any)).toBe('')
    expect(sanitizeInput(undefined as any)).toBe('')
    expect(sanitizeInput(123 as any)).toBe('')
  })

  it('should handle complex HTML content', () => {
    const input = '<div onclick="alert(1)">Hello <strong>World</strong></div>'
    expect(sanitizeInput(input)).toBe('Hello World')
  })

  it('should handle multiple HTML tags', () => {
    expect(sanitizeInput('<p>Hello</p><br/><img src="x"/>')).toBe('Hello')
  })

  it('should remove script tag content', () => {
    expect(sanitizeInput('<script>alert("test")</script>')).toBe('')
  })

  it('should remove style tag content', () => {
    expect(sanitizeInput('<style>.test { color: red; }</style>hello')).toBe(
      'hello'
    )
  })

  it('should remove iframe tag content', () => {
    expect(sanitizeInput('<iframe src="evil.com"></iframe>safe')).toBe('safe')
  })

  it('should handle text with special characters and HTML', () => {
    const input = '<script>alert("test")</script>Price: $100 & discount'
    expect(sanitizeInput(input)).toBe('Price: $100 &amp; discount')
  })
})
