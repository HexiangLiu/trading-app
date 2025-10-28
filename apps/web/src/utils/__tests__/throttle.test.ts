import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { throttle } from '../throttle'

describe('throttle', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should execute function immediately on first call', () => {
    const mockFn = vi.fn()
    const throttledFn = throttle(mockFn, 100)

    throttledFn()
    expect(mockFn).toHaveBeenCalledTimes(1)
  })

  it('should throttle function calls within delay period', () => {
    const mockFn = vi.fn()
    const throttledFn = throttle(mockFn, 100)

    throttledFn()
    expect(mockFn).toHaveBeenCalledTimes(1)

    throttledFn()
    throttledFn()
    expect(mockFn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(100)
    expect(mockFn).toHaveBeenCalledTimes(2)
  })

  it('should allow execution after delay period', () => {
    const mockFn = vi.fn()
    const throttledFn = throttle(mockFn, 100)

    throttledFn()
    vi.advanceTimersByTime(100)
    throttledFn()
    vi.advanceTimersByTime(100)
    throttledFn()

    expect(mockFn).toHaveBeenCalledTimes(3)
  })

  it('should pass arguments to the throttled function', () => {
    const mockFn = vi.fn()
    const throttledFn = throttle(mockFn, 100)

    throttledFn('arg1', 'arg2')
    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
  })

  it('should schedule delayed execution when called within delay period', () => {
    const mockFn = vi.fn()
    const throttledFn = throttle(mockFn, 100)

    throttledFn()
    throttledFn()
    expect(mockFn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(50)
    expect(mockFn).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(50)
    expect(mockFn).toHaveBeenCalledTimes(2)
  })
})
