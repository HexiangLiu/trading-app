import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Order, TradeData } from '../tradeAggregator'
import {
  destroyTradeWorkerManager,
  getTradeWorkerManager
} from '../tradeWorkerManager'

// Mock console methods
globalThis.console.log = vi.fn()
globalThis.console.warn = vi.fn()
globalThis.console.error = vi.fn()

// Mock Worker
class MockWorker {
  url: string
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((error: ErrorEvent) => void) | null = null
  lastMessage: any = undefined

  constructor(url: string) {
    this.url = url
  }

  postMessage(data: any) {
    // Store message for testing
    this.lastMessage = data
  }

  terminate() {
    // Mock termination
  }

  simulateMessage(data: any) {
    this.onmessage?.({ data } as MessageEvent)
  }
}

describe('TradeWorkerManager', () => {
  let manager: ReturnType<typeof getTradeWorkerManager>

  beforeEach(() => {
    // Mock Worker constructor
    globalThis.Worker = MockWorker as any
    destroyTradeWorkerManager()
    manager = getTradeWorkerManager()
  })

  afterEach(() => {
    destroyTradeWorkerManager()
  })

  describe('initialization', () => {
    it('should initialize worker on construction', () => {
      expect(manager.initialized).toBe(true)
    })

    it('should return same instance on multiple calls', () => {
      const manager1 = getTradeWorkerManager()
      const manager2 = getTradeWorkerManager()
      expect(manager1).toBe(manager2)
    })
  })

  describe('subscribe', () => {
    it('should send SUBSCRIBE message to worker', () => {
      const worker = (manager as any).worker as MockWorker
      manager.subscribe('BTCUSDT')

      expect(worker.lastMessage).toEqual({
        type: 'SUBSCRIBE',
        data: { symbol: 'BTCUSDT' }
      })
    })

    it('should not send message if worker not initialized', () => {
      ;(manager as any).isInitialized = false
      ;(manager as any).worker = null

      manager.subscribe('BTCUSDT')

      expect(globalThis.console.warn).toHaveBeenCalledWith(
        'Worker not initialized, cannot subscribe to:',
        'BTCUSDT'
      )
    })
  })

  describe('unsubscribe', () => {
    it('should send UNSUBSCRIBE message to worker', () => {
      const worker = (manager as any).worker as MockWorker
      manager.unsubscribe('BTCUSDT')

      expect(worker.lastMessage).toEqual({
        type: 'UNSUBSCRIBE',
        data: { symbol: 'BTCUSDT' }
      })
    })

    it('should not send message if worker not initialized', () => {
      ;(manager as any).isInitialized = false
      ;(manager as any).worker = null

      manager.unsubscribe('BTCUSDT')

      expect(globalThis.console.warn).toHaveBeenCalledWith(
        'Worker not initialized, cannot unsubscribe from:',
        'BTCUSDT'
      )
    })
  })

  describe('sendTradeData', () => {
    it('should send TRADE_DATA message to worker', () => {
      const worker = (manager as any).worker as MockWorker
      const tradeData: TradeData = {
        symbol: 'BTCUSDT',
        price: 50000,
        quantity: 0.1,
        timestamp: Date.now()
      }

      manager.sendTradeData(tradeData)

      expect(worker.lastMessage).toEqual({
        type: 'TRADE_DATA',
        data: tradeData
      })
    })

    it('should not send message if worker not initialized', () => {
      const worker = (manager as any).worker as MockWorker
      ;(manager as any).isInitialized = false
      ;(manager as any).worker = null

      manager.sendTradeData({
        symbol: 'BTCUSDT',
        price: 50000,
        quantity: 0.1,
        timestamp: Date.now()
      })

      expect(worker.lastMessage).toBeUndefined()
    })
  })

  describe('updateOrders', () => {
    it('should send ORDERS_UPDATE message to worker', () => {
      const worker = (manager as any).worker as MockWorker
      const orders: Order[] = [
        {
          id: '1',
          symbol: 'BTCUSDT',
          exchange: 'BINANCE',
          side: 'BUY',
          type: 'LIMIT',
          price: 50000,
          quantity: 0.1,
          postOnly: true,
          status: 'FILLED',
          timestamp: Date.now()
        }
      ]

      manager.updateOrders(orders)

      expect(worker.lastMessage).toEqual({
        type: 'ORDERS_UPDATE',
        data: { orders }
      })
    })

    it('should not send message if worker not initialized', () => {
      const worker = (manager as any).worker as MockWorker
      ;(manager as any).isInitialized = false
      ;(manager as any).worker = null

      manager.updateOrders([])

      expect(worker.lastMessage).toBeUndefined()
    })
  })

  describe('message handling', () => {
    it('should register message handler', () => {
      const handler = vi.fn()
      manager.onMessage('AGGREGATED_PRICES', handler)

      const worker = (manager as any).worker as MockWorker
      worker.simulateMessage({
        type: 'AGGREGATED_PRICES',
        data: [{ symbol: 'BTCUSDT', price: 50000 }]
      })

      expect(handler).toHaveBeenCalledWith([
        { symbol: 'BTCUSDT', price: 50000 }
      ])
    })

    it('should handle PNL_UPDATE messages', () => {
      const handler = vi.fn()
      manager.onMessage('PNL_UPDATE', handler)

      const worker = (manager as any).worker as MockWorker
      const mockPnLData = {
        positions: [],
        totalUnrealizedPnL: 0,
        totalRealizedPnL: 0
      }

      worker.simulateMessage({
        type: 'PNL_UPDATE',
        data: mockPnLData
      })

      expect(handler).toHaveBeenCalledWith(mockPnLData)
    })

    it('should handle POSITION_CLOSED messages', () => {
      const handler = vi.fn()
      manager.onMessage('POSITION_CLOSED', handler)

      const worker = (manager as any).worker as MockWorker
      const mockClosedData = {
        symbol: 'binance:BTCUSDT',
        closedOrders: [],
        realizedPnL: 100
      }

      worker.simulateMessage({
        type: 'POSITION_CLOSED',
        data: mockClosedData
      })

      expect(handler).toHaveBeenCalledWith(mockClosedData)
    })

    it('should unregister message handler', () => {
      const handler = vi.fn()
      manager.onMessage('AGGREGATED_PRICES', handler)
      manager.offMessage('AGGREGATED_PRICES')

      const worker = (manager as any).worker as MockWorker
      worker.simulateMessage({
        type: 'AGGREGATED_PRICES',
        data: []
      })

      expect(handler).not.toHaveBeenCalled()
    })
  })

  describe('destroy', () => {
    it('should terminate worker and clear handlers', () => {
      const worker = (manager as any).worker as MockWorker
      const terminateSpy = vi.spyOn(worker, 'terminate')

      manager.destroy()

      expect(terminateSpy).toHaveBeenCalled()
      expect(manager.initialized).toBe(false)
    })
  })
})
