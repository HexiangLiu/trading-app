import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Order } from '@/types/order'
import { OrderSide, OrderStatus, OrderType } from '@/types/order'
import { usePnL } from '../usePnL'

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

describe('usePnL', () => {
  const mockOrder: Order = {
    id: 'order_1',
    symbol: 'BTCUSDT',
    exchange: 'binance',
    side: OrderSide.BUY,
    type: OrderType.LIMIT,
    price: 50000,
    quantity: 0.01,
    postOnly: false,
    status: OrderStatus.PENDING,
    timestamp: Date.now()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockWorkerManagerData.initialized = true
  })

  it('should return pnlData', () => {
    const { result } = renderHook(() => usePnL([]))

    expect(result.current.pnlData).toBeDefined()
    expect(result.current.pnlData.positions).toEqual([])
    expect(result.current.pnlData.totalUnrealizedPnL).toBe(0)
  })

  it('should update orders in worker when orders change', async () => {
    const { getTradeWorkerManager } = await import(
      '@/workers/tradeWorkerManager'
    )
    const workerManager = getTradeWorkerManager()

    const { rerender } = renderHook(usePnL, {
      initialProps: [] as Order[]
    })

    await waitFor(() => {
      expect(workerManager.sendMessage).toHaveBeenCalled()
    })

    // Change orders
    act(() => {
      rerender([mockOrder])
    })

    await waitFor(() => {
      expect(workerManager.sendMessage).toHaveBeenCalledWith({
        type: 'ORDERS_UPDATE',
        data: { orders: [mockOrder] }
      })
    })
  })

  it('should register PnL update and position closed message handlers', async () => {
    const { getTradeWorkerManager } = await import(
      '@/workers/tradeWorkerManager'
    )
    const workerManager = getTradeWorkerManager()

    renderHook(() => usePnL([]))

    await waitFor(() => {
      expect(workerManager.onMessage).toHaveBeenCalledWith(
        'PNL_UPDATE',
        expect.any(Function)
      )
      expect(workerManager.onMessage).toHaveBeenCalledWith(
        'POSITION_CLOSED',
        expect.any(Function)
      )
    })
  })

  it('should update pnlData when receiving PnL update', async () => {
    const { getTradeWorkerManager } = await import(
      '@/workers/tradeWorkerManager'
    )
    const workerManager = getTradeWorkerManager()

    const { result } = renderHook(() => usePnL([]))

    // Get the handler that was registered
    const handlerCall = (workerManager.onMessage as any).mock.calls.find(
      (call: any[]) => call[0] === 'PNL_UPDATE'
    )
    const handler = handlerCall?.[1]

    expect(handler).toBeDefined()

    // Simulate PnL update (no longer includes totalRealizedPnL)
    const mockPnLData = {
      positions: [
        {
          symbol: 'BTCUSDT',
          exchange: 'binance',
          quantity: 0.01,
          averagePrice: 50000,
          unrealizedPnL: 100,
          lastUpdate: Date.now()
        }
      ],
      totalUnrealizedPnL: 100
    }

    act(() => {
      handler(mockPnLData)
    })

    await waitFor(() => {
      expect(result.current.pnlData.positions).toHaveLength(1)
      expect(result.current.pnlData.totalUnrealizedPnL).toBe(100)
    })
  })

  it('should handle position closed events', async () => {
    const { getTradeWorkerManager } = await import(
      '@/workers/tradeWorkerManager'
    )
    const workerManager = getTradeWorkerManager()

    renderHook(() => usePnL([]))

    // Get the position closed handler
    const handlerCall = (workerManager.onMessage as any).mock.calls.find(
      (call: any[]) => call[0] === 'POSITION_CLOSED'
    )
    const handler = handlerCall?.[1]

    expect(handler).toBeDefined()

    // Simulate position closed event
    const payload = {
      exchange: 'binance',
      symbol: 'BTCUSDT'
    }

    // The handler should not throw when called with a valid payload
    expect(() => handler(payload)).not.toThrow()
  })

  it('should cleanup message handlers on unmount', async () => {
    const { getTradeWorkerManager } = await import(
      '@/workers/tradeWorkerManager'
    )
    const workerManager = getTradeWorkerManager()

    const { unmount } = renderHook(() => usePnL([]))

    unmount()

    await waitFor(() => {
      expect(workerManager.offMessage).toHaveBeenCalledWith('PNL_UPDATE')
      expect(workerManager.offMessage).toHaveBeenCalledWith('POSITION_CLOSED')
    })
  })

  it('should warn when worker is not initialized', async () => {
    mockWorkerManagerData.initialized = false

    renderHook(() => usePnL([]))

    await waitFor(() => {
      expect(globalThis.console.warn).toHaveBeenCalledWith(
        'Trade Worker not initialized'
      )
    })
  })

  it('should handle multiple PnL updates', async () => {
    const { getTradeWorkerManager } = await import(
      '@/workers/tradeWorkerManager'
    )
    const workerManager = getTradeWorkerManager()

    const { result } = renderHook(() => usePnL([]))

    const handlerCall = (workerManager.onMessage as any).mock.calls.find(
      (call: any[]) => call[0] === 'PNL_UPDATE'
    )
    const handler = handlerCall?.[1]

    // First update
    act(() => {
      handler({
        positions: [
          {
            symbol: 'BTCUSDT',
            exchange: 'binance',
            quantity: 0.01,
            averagePrice: 50000,
            unrealizedPnL: 100,
            lastUpdate: Date.now()
          }
        ],
        totalUnrealizedPnL: 100
      })
    })

    await waitFor(() => {
      expect(result.current.pnlData.totalUnrealizedPnL).toBe(100)
    })

    // Second update
    act(() => {
      handler({
        positions: [
          {
            symbol: 'BTCUSDT',
            exchange: 'binance',
            quantity: 0.01,
            averagePrice: 50000,
            unrealizedPnL: 150,
            lastUpdate: Date.now()
          },
          {
            symbol: 'ETHUSDT',
            exchange: 'binance',
            quantity: 0.5,
            averagePrice: 3000,
            unrealizedPnL: 50,
            lastUpdate: Date.now()
          }
        ],
        totalUnrealizedPnL: 200
      })
    })

    await waitFor(() => {
      expect(result.current.pnlData.positions).toHaveLength(2)
      expect(result.current.pnlData.totalUnrealizedPnL).toBe(200)
    })
  })
})
