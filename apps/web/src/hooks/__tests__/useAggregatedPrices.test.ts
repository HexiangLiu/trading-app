import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAggregatedPrices } from '../useAggregatedPrices'

// Mock tradeWorkerManager
const mockWorkerManagerData = {
  initialized: true,
  sendMessage: vi.fn(),
  onMessage: vi.fn(),
  offMessage: vi.fn()
}

vi.mock('@/workers/tradeWorkerManager', () => {
  return {
    getTradeWorkerManager: () => mockWorkerManagerData
  }
})

// Mock console.warn
globalThis.console.warn = vi.fn()

describe('useAggregatedPrices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWorkerManagerData.initialized = true
  })

  it('should return initial state', () => {
    const { result } = renderHook(() => useAggregatedPrices())

    expect(result.current.prices).toEqual({})
    expect(result.current.isConnected).toBe(true)
    expect(typeof result.current.subscribe).toBe('function')
    expect(typeof result.current.unsubscribe).toBe('function')
    expect(typeof result.current.getPrice).toBe('function')
  })

  it('should register aggregated prices message handler', async () => {
    const { getTradeWorkerManager } = await import(
      '@/workers/tradeWorkerManager'
    )
    const workerManager = getTradeWorkerManager()

    renderHook(() => useAggregatedPrices())

    await waitFor(() => {
      expect(workerManager.onMessage).toHaveBeenCalledWith(
        'AGGREGATED_PRICES',
        expect.any(Function)
      )
    })
  })

  it('should update prices when receiving aggregated prices', async () => {
    const { getTradeWorkerManager } = await import(
      '@/workers/tradeWorkerManager'
    )
    const workerManager = getTradeWorkerManager()

    const { result } = renderHook(() => useAggregatedPrices())

    // Get the handler
    const handlerCall = (workerManager.onMessage as any).mock.calls.find(
      (call: any[]) => call[0] === 'AGGREGATED_PRICES'
    )
    const handler = handlerCall?.[1]

    expect(handler).toBeDefined()

    // Simulate price update
    const mockPrices = [
      {
        symbol: 'BTCUSDT',
        price: 50000,
        lastUpdate: Date.now()
      },
      {
        symbol: 'ETHUSDT',
        price: 3000,
        lastUpdate: Date.now()
      }
    ]

    act(() => {
      handler(mockPrices)
    })

    await waitFor(() => {
      expect(result.current.prices['BTCUSDT']).toBeDefined()
      expect(result.current.prices['BTCUSDT'].price).toBe(50000)
      expect(result.current.prices['ETHUSDT']).toBeDefined()
      expect(result.current.prices['ETHUSDT'].price).toBe(3000)
    })
  })

  it('should subscribe to symbols', async () => {
    const { getTradeWorkerManager } = await import(
      '@/workers/tradeWorkerManager'
    )
    const workerManager = getTradeWorkerManager()

    const { result } = renderHook(() => useAggregatedPrices())

    act(() => {
      result.current.subscribe('BTCUSDT')
    })

    await waitFor(() => {
      expect(workerManager.sendMessage).toHaveBeenCalledWith({
        type: 'SUBSCRIBE',
        data: { symbol: 'BTCUSDT' }
      })
    })
  })

  it('should unsubscribe from symbols', async () => {
    const { getTradeWorkerManager } = await import(
      '@/workers/tradeWorkerManager'
    )
    const workerManager = getTradeWorkerManager()

    const { result } = renderHook(() => useAggregatedPrices())

    act(() => {
      result.current.unsubscribe('BTCUSDT')
    })

    await waitFor(() => {
      expect(workerManager.sendMessage).toHaveBeenCalledWith({
        type: 'UNSUBSCRIBE',
        data: { symbol: 'BTCUSDT' }
      })
    })
  })

  it('should not subscribe when worker is not initialized', async () => {
    mockWorkerManagerData.initialized = false

    const { result } = renderHook(() => useAggregatedPrices())

    act(() => {
      result.current.subscribe('BTCUSDT')
    })

    await waitFor(() => {
      expect(mockWorkerManagerData.sendMessage).not.toHaveBeenCalled()
    })
  })

  it('should not unsubscribe when worker is not initialized', async () => {
    mockWorkerManagerData.initialized = false

    const { result } = renderHook(() => useAggregatedPrices())

    act(() => {
      result.current.unsubscribe('BTCUSDT')
    })

    await waitFor(() => {
      expect(mockWorkerManagerData.sendMessage).not.toHaveBeenCalled()
    })
  })

  it('should get price for specific symbol', async () => {
    const { getTradeWorkerManager } = await import(
      '@/workers/tradeWorkerManager'
    )
    const workerManager = getTradeWorkerManager()

    const { result } = renderHook(() => useAggregatedPrices())

    // First, update prices
    const handlerCall = (workerManager.onMessage as any).mock.calls.find(
      (call: any[]) => call[0] === 'AGGREGATED_PRICES'
    )
    const handler = handlerCall?.[1]

    act(() => {
      handler([{ symbol: 'BTCUSDT', price: 50000, lastUpdate: Date.now() }])
    })

    await waitFor(() => {
      const price = result.current.getPrice('BTCUSDT')
      expect(price).toBeDefined()
      expect(price?.price).toBe(50000)
    })
  })

  it('should return undefined for non-existent symbol', () => {
    const { result } = renderHook(() => useAggregatedPrices())

    const price = result.current.getPrice('NONEXISTENT')
    expect(price).toBeUndefined()
  })

  it('should warn when worker is not initialized', async () => {
    mockWorkerManagerData.initialized = false

    renderHook(() => useAggregatedPrices())

    await waitFor(() => {
      expect(console.warn).toHaveBeenCalledWith('Trade Worker not initialized')
    })
  })

  it('should merge new prices with existing prices', async () => {
    const { getTradeWorkerManager } = await import(
      '@/workers/tradeWorkerManager'
    )
    const workerManager = getTradeWorkerManager()

    const { result } = renderHook(() => useAggregatedPrices())

    const handlerCall = (workerManager.onMessage as any).mock.calls.find(
      (call: any[]) => call[0] === 'AGGREGATED_PRICES'
    )
    const handler = handlerCall?.[1]

    // First update
    act(() => {
      handler([{ symbol: 'BTCUSDT', price: 50000, lastUpdate: Date.now() }])
    })

    await waitFor(() => {
      expect(result.current.prices['BTCUSDT']).toBeDefined()
    })

    // Second update with additional symbol
    act(() => {
      handler([
        { symbol: 'BTCUSDT', price: 51000, lastUpdate: Date.now() },
        { symbol: 'ETHUSDT', price: 3000, lastUpdate: Date.now() }
      ])
    })

    await waitFor(() => {
      expect(result.current.prices['BTCUSDT'].price).toBe(51000)
      expect(result.current.prices['ETHUSDT'].price).toBe(3000)
    })
  })

  it('should cleanup message handler on unmount', async () => {
    const { getTradeWorkerManager } = await import(
      '@/workers/tradeWorkerManager'
    )
    const workerManager = getTradeWorkerManager()

    const { unmount } = renderHook(() => useAggregatedPrices())

    unmount()

    await waitFor(() => {
      expect(workerManager.offMessage).toHaveBeenCalledWith('AGGREGATED_PRICES')
    })
  })
})
