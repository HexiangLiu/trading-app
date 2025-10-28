import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useVisibleRows } from '../useVisibleRows'

describe('useVisibleRows', () => {
  beforeEach(() => {
    // Mock ResizeObserver class
    globalThis.ResizeObserver = class ResizeObserver {
      observe = vi.fn()
      disconnect = vi.fn()
      unobserve = vi.fn()
    } as any
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return containerRef and totalVisibleRows', () => {
    const { result } = renderHook(() => useVisibleRows({ rowHeight: 30 }))

    expect(result.current.containerRef).toBeDefined()
    expect(typeof result.current.containerRef).toBe('function')
    expect(result.current.totalVisibleRows).toBe(0)
  })

  it('should calculate visible rows based on container height', async () => {
    const { result } = renderHook(() => useVisibleRows({ rowHeight: 30 }))

    // Create a mock div element
    const mockDiv = document.createElement('div')
    mockDiv.style.height = '150px'
    Object.defineProperty(mockDiv, 'clientHeight', {
      get: () => 150
    })

    // Attach the ref (wrapped in act)
    act(() => {
      result.current.containerRef(mockDiv)
    })

    // Wait for the calculation
    await waitFor(() => {
      expect(result.current.totalVisibleRows).toBe(5) // 150 / 30 = 5
    })
  })

  it('should handle different row heights', async () => {
    const { result } = renderHook(() => useVisibleRows({ rowHeight: 50 }))

    const mockDiv = document.createElement('div')
    Object.defineProperty(mockDiv, 'clientHeight', {
      get: () => 200
    })

    act(() => {
      result.current.containerRef(mockDiv)
    })

    await waitFor(() => {
      expect(result.current.totalVisibleRows).toBe(4) // 200 / 50 = 4
    })
  })

  it('should handle null element', () => {
    const { result } = renderHook(() => useVisibleRows({ rowHeight: 30 }))

    // Pass null
    act(() => {
      result.current.containerRef(null)
    })

    expect(result.current.totalVisibleRows).toBe(0)
  })

  it('should handle zero height', async () => {
    const { result } = renderHook(() => useVisibleRows({ rowHeight: 30 }))

    const mockDiv = document.createElement('div')
    Object.defineProperty(mockDiv, 'clientHeight', {
      get: () => 0
    })

    act(() => {
      result.current.containerRef(mockDiv)
    })

    await waitFor(() => {
      expect(result.current.totalVisibleRows).toBe(0)
    })
  })

  it('should use ResizeObserver to watch for changes', () => {
    const observeMock = vi.fn()
    const disconnectMock = vi.fn()

    globalThis.ResizeObserver = class ResizeObserver {
      observe = observeMock
      disconnect = disconnectMock
      unobserve = vi.fn()
    } as any

    const { result } = renderHook(() => useVisibleRows({ rowHeight: 30 }))

    const mockDiv = document.createElement('div')
    act(() => {
      result.current.containerRef(mockDiv)
    })

    expect(observeMock).toHaveBeenCalledWith(mockDiv)
  })

  it('should trigger ResizeObserver callback on resize', async () => {
    let resizeCallback: (() => void) | null = null

    globalThis.ResizeObserver = class ResizeObserver {
      observe = vi.fn()
      disconnect = vi.fn()
      unobserve = vi.fn()
      constructor(callback: () => void) {
        resizeCallback = callback
      }
    } as any

    const { result } = renderHook(() => useVisibleRows({ rowHeight: 30 }))

    const mockDiv = document.createElement('div')
    let clientHeight = 90
    Object.defineProperty(mockDiv, 'clientHeight', {
      get: () => clientHeight,
      configurable: true
    })

    act(() => {
      result.current.containerRef(mockDiv)
    })

    // Wait for initial calculation
    await waitFor(() => {
      expect(result.current.totalVisibleRows).toBe(3) // 90 / 30 = 3
    })

    // Trigger ResizeObserver callback
    clientHeight = 150
    act(() => {
      if (resizeCallback) {
        resizeCallback()
      }
    })

    await waitFor(() => {
      expect(result.current.totalVisibleRows).toBe(5) // 150 / 30 = 5
    })
  })

  it('should listen to gridlayoutresize events', async () => {
    const { result } = renderHook(() => useVisibleRows({ rowHeight: 30 }))

    const mockDiv = document.createElement('div')
    let clientHeight = 90
    Object.defineProperty(mockDiv, 'clientHeight', {
      get: () => clientHeight,
      configurable: true
    })

    act(() => {
      result.current.containerRef(mockDiv)
    })

    // Wait for initial calculation
    await waitFor(() => {
      expect(result.current.totalVisibleRows).toBe(3) // 90 / 30 = 3
    })

    // Change height and dispatch event
    clientHeight = 120
    const event = new CustomEvent('gridlayoutresize')
    act(() => {
      document.dispatchEvent(event)
    })

    await waitFor(() => {
      expect(result.current.totalVisibleRows).toBe(4) // 120 / 30 = 4
    })
  })

  it('should cleanup event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

    const { result, unmount } = renderHook(() =>
      useVisibleRows({ rowHeight: 30 })
    )

    const mockDiv = document.createElement('div')
    act(() => {
      result.current.containerRef(mockDiv)
    })

    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'gridlayoutresize',
      expect.any(Function)
    )
  })

  it('should cleanup ResizeObserver on unmount', () => {
    const disconnectMock = vi.fn()

    globalThis.ResizeObserver = class ResizeObserver {
      observe = vi.fn()
      disconnect = disconnectMock
      unobserve = vi.fn()
    } as any

    const { result, unmount } = renderHook(() =>
      useVisibleRows({ rowHeight: 30 })
    )

    const mockDiv = document.createElement('div')
    act(() => {
      result.current.containerRef(mockDiv)
    })

    unmount()

    expect(disconnectMock).toHaveBeenCalled()
  })
})
