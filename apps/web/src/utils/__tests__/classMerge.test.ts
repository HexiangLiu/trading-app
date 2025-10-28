import { describe, expect, it } from 'vitest'
import { cn } from '../classMerge'

describe('cn (classMerge)', () => {
  it('should merge multiple class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('should handle undefined and null values', () => {
    expect(cn('foo', undefined, 'bar', null)).toBe('foo bar')
  })

  it('should handle conditional classes', () => {
    expect(cn('foo', true && 'bar', false && 'baz')).toBe('foo bar')
  })

  it('should merge Tailwind classes and override conflicts', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('should handle arrays', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz')
  })

  it('should handle objects', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })

  it('should return empty string for no inputs', () => {
    expect(cn()).toBe('')
  })

  it('should handle complex cases', () => {
    expect(
      cn('p-2', ['m-2', 'm-4'], { 'text-red': true, 'text-blue': false })
    ).toBe('p-2 m-4 text-red')
  })
})
