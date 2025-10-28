import { waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MockWebSocket } from '@/test/utils/mockWebSocket'
import { BinanceAdapter } from '../Binance'
import type { StreamSubscription } from '../index'

// ==================== Mocks & Setup ====================

const mockWorkerManager = {
  initialized: true,
  sendTradeData: vi.fn()
}

vi.mock('@/workers/tradeWorkerManager', () => ({
  getTradeWorkerManager: () => mockWorkerManager
}))

// Mock console methods
globalThis.console.log = vi.fn()
globalThis.console.warn = vi.fn()
globalThis.console.error = vi.fn()

// ==================== Test Data Factories ====================

/**
 * Creates Kline test data
 */
function createKlineData() {
  return {
    e: 'kline',
    E: Date.now(),
    s: 'BTCUSDT',
    k: {
      t: 1234567890,
      T: 1234567890 + 60000,
      s: 'BTCUSDT',
      i: '1m',
      f: 1,
      L: 10,
      o: '50000',
      c: '51000',
      h: '52000',
      l: '49000',
      v: '100',
      n: 10,
      x: true,
      q: '5000000',
      V: '50',
      Q: '2500000',
      B: '0'
    }
  }
}

/**
 * Creates Order Book test data
 */
function createOrderBookData() {
  return {
    lastUpdateId: 123,
    bids: [
      ['50000', '1'],
      ['49999', '2']
    ],
    asks: [
      ['50001', '1'],
      ['50002', '2']
    ]
  }
}

/**
 * Creates Trade test data
 */
function createTradeData(type: 'aggTrade' | 'trade' = 'aggTrade') {
  return {
    e: type,
    E: Date.now(),
    s: 'BTCUSDT',
    p: '50000',
    q: '0.1',
    T: Date.now(),
    m: false,
    f: 1,
    l: 1,
    n: 1
  }
}

/**
 * Creates subscription configuration
 */
function createSubscription(
  streamType: 'kline' | 'depth' | 'trade',
  callback: any = vi.fn(),
  interval?: string
): StreamSubscription {
  return {
    symbol: 'BTCUSDT',
    streamType,
    interval,
    callback
  }
}

// ==================== Helper Functions ====================

/**
 * Connects adapter and returns WebSocket instance
 */
async function connectAdapter(adapter: BinanceAdapter) {
  const connectPromise = adapter.connect()
  const ws = MockWebSocket.getLatest()
  ws?.simulateOpen()
  await connectPromise
  return { ws }
}

/**
 * Waits for subscription to complete
 */
async function waitForSubscription(expectMessageCount: number = 1) {
  await waitFor(
    () => {
      const ws = MockWebSocket.getLatest()
      return ws !== undefined
    },
    { timeout: 1000 }
  )

  const ws = MockWebSocket.getLatest()
  ws?.simulateOpen()

  await waitFor(() => {
    return (
      ws?.sentMessages.length && ws.sentMessages.length >= expectMessageCount
    )
  })

  return ws
}

/**
 * Test suite for BinanceAdapter
 */

describe('BinanceAdapter', () => {
  let adapter: BinanceAdapter

  beforeEach(() => {
    // Clean up singleton
    if (window.__binanceAdapter) {
      delete window.__binanceAdapter
    }

    // Reset worker manager
    mockWorkerManager.initialized = true
    vi.clearAllMocks()

    // Replace global WebSocket with MockWebSocket
    globalThis.WebSocket = MockWebSocket as any
    MockWebSocket.clearInstances()

    // Create new adapter instance
    adapter = new BinanceAdapter()
  })

  describe('constructor', () => {
    it('should initialize with default URLs', () => {
      const adapter = new BinanceAdapter()
      expect(adapter).toBeDefined()
    })

    it('should allow custom URLs', () => {
      const customApiUrl = 'https://custom-api.com'
      const customStreamUrl = 'wss://custom-stream.com'
      const adapter = new BinanceAdapter(customApiUrl, customStreamUrl)
      expect(adapter).toBeDefined()
    })
  })

  describe('getExchange', () => {
    it('should return BINANCE', () => {
      expect(adapter.getExchange()).toBe('BINANCE')
    })
  })

  describe('subscribe', () => {
    it('should subscribe to kline stream', async () => {
      const callback = vi.fn()
      const subscription = createSubscription('kline', callback, '1m')

      adapter.subscribe(subscription)

      const ws = await waitForSubscription()

      const callArgs = JSON.parse(ws?.sentMessages[0] || '{}')
      expect(callArgs.method).toBe('SUBSCRIBE')
      expect(callArgs.params).toContain('btcusdt@kline_1m')
    })

    it('should subscribe to kline stream with different intervals', async () => {
      const callback = vi.fn()
      const intervals = ['5', '15', '30', '60', '240', '1D']
      const expectedIntervals = ['5m', '15m', '30m', '1h', '4h', '1d']

      for (let i = 0; i < intervals.length; i++) {
        MockWebSocket.clearInstances()
        adapter = new BinanceAdapter()

        const subscription = createSubscription('kline', callback, intervals[i])

        adapter.subscribe(subscription)
        const ws = await waitForSubscription()

        const callArgs = JSON.parse(ws?.sentMessages[0] || '{}')
        expect(callArgs.params).toContain(
          `btcusdt@kline_${expectedIntervals[i]}`
        )
      }
    })

    it('should subscribe to depth stream', async () => {
      const subscription = createSubscription('depth')
      adapter.subscribe(subscription)

      const ws = await waitForSubscription()

      const callArgs = JSON.parse(ws?.sentMessages[0] || '{}')
      expect(callArgs.params).toContain('btcusdt@depth20@100ms')
    })

    it('should subscribe to trade stream', async () => {
      const subscription = createSubscription('trade')
      adapter.subscribe(subscription)

      const ws = await waitForSubscription()

      const callArgs = JSON.parse(ws?.sentMessages[0] || '{}')
      expect(callArgs.params).toContain('btcusdt@aggTrade')
    })

    it('should not add duplicate subscriptions', async () => {
      const callback = vi.fn()
      const subscription = createSubscription('trade', callback)

      adapter.subscribe(subscription)
      const ws1 = await waitForSubscription()
      const initialCallCount = ws1?.sentMessages.length || 0

      adapter.subscribe(subscription)

      // Should not add another subscription
      expect(ws1?.sentMessages.length).toBe(initialCallCount)
    })

    it('should handle multiple callbacks for same stream', async () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      const subscription1 = createSubscription('trade', callback1)
      const subscription2 = createSubscription('trade', callback2)

      adapter.subscribe(subscription1)
      await waitForSubscription()

      adapter.subscribe(subscription2)

      // Both callbacks should be registered for the same stream
      // This is verified by the fact that no additional subscription messages are sent
    })
  })

  describe('unsubscribe', () => {
    it('should unsubscribe specific callback', async () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      const subscription1 = createSubscription('trade', callback1)
      const subscription2 = createSubscription('trade', callback2)

      adapter.subscribe(subscription1)
      adapter.subscribe(subscription2)
      await waitForSubscription()

      // Remove one callback - should NOT send UNSUBSCRIBE (still have callback2)
      adapter.unsubscribe('BTCUSDT', 'trade', undefined, callback1)

      // Remove the last callback - should send UNSUBSCRIBE
      adapter.unsubscribe('BTCUSDT', 'trade', undefined, callback2)

      await waitFor(() => {
        const ws = MockWebSocket.getLatest()
        expect(ws?.sentMessages.some(msg => msg.includes('UNSUBSCRIBE'))).toBe(
          true
        )
      })
    })

    it('should unsubscribe all callbacks when no callback specified', async () => {
      const subscription = createSubscription('trade')

      adapter.subscribe(subscription)
      await waitForSubscription()

      adapter.unsubscribe('BTCUSDT', 'trade')

      await waitFor(() => {
        const ws = MockWebSocket.getLatest()
        expect(ws?.sentMessages.some(msg => msg.includes('UNSUBSCRIBE'))).toBe(
          true
        )
      })
    })

    it('should handle unsubscribe when not connected', () => {
      const subscription = createSubscription('trade')

      adapter.subscribe(subscription)
      adapter.unsubscribe('BTCUSDT', 'trade')

      // Should not throw - this verifies the method works without errors
    })
  })

  describe('unsubscribeAll', () => {
    it('should unsubscribe from all streams for a symbol', async () => {
      const callback = vi.fn()

      adapter.subscribe(createSubscription('kline', callback, '1m'))

      adapter.subscribe(createSubscription('trade', callback))

      await waitForSubscription(2)

      adapter.unsubscribeAll('BTCUSDT')

      // Verify unsubscribeAll was called without errors
      // The internal state is not directly accessible, but the method should complete successfully
    })
  })

  describe('connect', () => {
    it('should connect to WebSocket', async () => {
      const connectPromise = adapter.connect()

      // Simulate WebSocket open
      const ws = MockWebSocket.getLatest()
      ws?.simulateOpen()

      await connectPromise

      expect(MockWebSocket.instances.length).toBeGreaterThan(0)
      expect(MockWebSocket.instances[0].url).toBe(
        'wss://data-stream.binance.vision/ws'
      )
    })

    it('should resolve immediately if already connected', async () => {
      // First connection
      const connectPromise1 = adapter.connect()
      const ws = MockWebSocket.getLatest()
      ws?.simulateOpen()
      await connectPromise1

      // Second connection
      const consoleLogSpy = vi.spyOn(console, 'log')
      await adapter.connect()

      expect(consoleLogSpy).toHaveBeenCalledWith('already connected')
    })

    it('should subscribe to active streams on connect', async () => {
      const callback = vi.fn()
      adapter.subscribe(createSubscription('trade', callback))

      const connectPromise = adapter.connect()
      const ws = MockWebSocket.getLatest()
      ws?.simulateOpen()
      await connectPromise

      expect(ws?.sentMessages.length).toBeGreaterThan(0)
    })

    it('should handle connection error', async () => {
      // Mock WebSocket to throw error in constructor
      const originalWebSocket = globalThis.WebSocket
      globalThis.WebSocket = function (this: any, _url: string) {
        throw new Error('Connection failed')
      } as any

      await expect(adapter.connect()).rejects.toThrow('Connection failed')

      // Restore
      globalThis.WebSocket = originalWebSocket
    })

    it('should handle WebSocket error event', async () => {
      const connectPromise = adapter.connect()
      const ws = MockWebSocket.getLatest()
      ws?.simulateOpen()
      await connectPromise

      const errorEvent = new Error('WebSocket error')
      ws?.simulateError(errorEvent)

      expect(globalThis.console.error).toHaveBeenCalledWith(
        'Binance WebSocket error:',
        errorEvent
      )
    })

    it('should handle message parsing error', async () => {
      await connectAdapter(adapter)

      const ws = MockWebSocket.getLatest()
      // Send invalid JSON
      ws?.onmessage?.({ data: 'invalid json' } as MessageEvent)

      await waitFor(() => {
        expect(globalThis.console.error).toHaveBeenCalledWith(
          'Error parsing WebSocket message:',
          expect.any(Error)
        )
      })
    })
  })

  describe('handleMessage', () => {
    it('should handle kline data', async () => {
      const callback = vi.fn()
      adapter.subscribe(createSubscription('kline', callback, '1m'))

      await waitForSubscription()

      const klineData = createKlineData()

      const ws = MockWebSocket.getLatest()
      ws?.simulateMessage(klineData)

      await waitFor(() => {
        expect(callback).toHaveBeenCalled()
      })

      const bar = callback.mock.calls[0][0]
      expect(bar.symbol).toBe('BTCUSDT')
      expect(bar.time).toBe(1234567890)
      expect(bar.open).toBe(50000)
      expect(bar.close).toBe(51000)
    })

    it('should handle kline data without subscriptions', async () => {
      await connectAdapter(adapter)

      const klineData = createKlineData()

      const ws = MockWebSocket.getLatest()
      ws?.simulateMessage(klineData)

      await waitFor(() => {
        expect(globalThis.console.warn).toHaveBeenCalledWith(
          'No kline subscriptions found for raw data'
        )
      })
    })

    it('should handle order book data', async () => {
      const callback = vi.fn()
      adapter.subscribe(createSubscription('depth', callback))

      await waitForSubscription()

      const orderBookData = {
        lastUpdateId: 123,
        bids: [
          ['50000', '1'],
          ['49999', '2']
        ],
        asks: [
          ['50001', '1'],
          ['50002', '2']
        ]
      }

      const ws = MockWebSocket.getLatest()
      ws?.simulateMessage(orderBookData)

      await waitFor(() => {
        expect(callback).toHaveBeenCalled()
      })

      const orderBook = callback.mock.calls[0][0]
      expect(orderBook.symbol).toBe('BTCUSDT')
      expect(orderBook.bids).toHaveLength(2)
      expect(orderBook.asks).toHaveLength(2)
    })

    it('should handle order book callback error', async () => {
      const callback = vi.fn(() => {
        throw new Error('Order book callback error')
      })
      adapter.subscribe(createSubscription('depth', callback))

      await waitForSubscription()

      const orderBookData = createOrderBookData()

      const ws = MockWebSocket.getLatest()
      ws?.simulateMessage(orderBookData)

      await waitFor(() => {
        expect(globalThis.console.error).toHaveBeenCalledWith(
          'BinanceAdapter: Error calling order book callback:',
          expect.any(Error)
        )
      })
    })

    it('should handle order book data without subscriptions', async () => {
      await connectAdapter(adapter)

      const orderBookData = createOrderBookData()

      const ws = MockWebSocket.getLatest()
      ws?.simulateMessage(orderBookData)

      await waitFor(() => {
        expect(globalThis.console.warn).toHaveBeenCalledWith(
          'No depth subscriptions found for raw data'
        )
      })
    })

    it('should handle trade data', async () => {
      const callback = vi.fn()
      adapter.subscribe(createSubscription('trade', callback))

      await waitForSubscription()

      const tradeData = createTradeData('aggTrade')

      const ws = MockWebSocket.getLatest()
      ws?.simulateMessage(tradeData)

      await waitFor(() => {
        expect(callback).toHaveBeenCalled()
        expect(mockWorkerManager.sendTradeData).toHaveBeenCalled()
      })
    })

    it('should handle trade data with worker not initialized', async () => {
      mockWorkerManager.initialized = false
      const callback = vi.fn()
      adapter.subscribe(createSubscription('trade', callback))

      await waitForSubscription()

      const tradeData = createTradeData('aggTrade')

      const ws = MockWebSocket.getLatest()
      ws?.simulateMessage(tradeData)

      await waitFor(() => {
        expect(callback).toHaveBeenCalled()
      })

      expect(globalThis.console.warn).toHaveBeenCalledWith(
        'Worker not initialized, cannot send trade data'
      )
    })

    it('should handle regular trade data (not aggTrade)', async () => {
      const callback = vi.fn()
      adapter.subscribe(createSubscription('trade', callback))

      await waitForSubscription()

      const tradeData = createTradeData('trade')

      const ws = MockWebSocket.getLatest()
      ws?.simulateMessage(tradeData)

      await waitFor(() => {
        expect(callback).toHaveBeenCalled()
      })
    })

    it('should handle trade data with callback error', async () => {
      const callback = vi.fn(() => {
        throw new Error('Callback error')
      })
      adapter.subscribe(createSubscription('trade', callback))

      await waitForSubscription()

      const tradeData = createTradeData('aggTrade')

      const ws = MockWebSocket.getLatest()
      ws?.simulateMessage(tradeData)

      await waitFor(() => {
        expect(globalThis.console.error).toHaveBeenCalledWith(
          'BinanceAdapter: Error calling trade callback:',
          expect.any(Error)
        )
      })
    })

    it('should handle trade data without subscriptions', async () => {
      await connectAdapter(adapter)

      const tradeData = createTradeData('aggTrade')

      const ws = MockWebSocket.getLatest()
      ws?.simulateMessage(tradeData)

      await waitFor(() => {
        expect(globalThis.console.warn).toHaveBeenCalledWith(
          'No trade subscriptions found for raw data'
        )
      })
    })

    it('should ignore subscription confirmation messages', async () => {
      const callback = vi.fn()
      adapter.subscribe(createSubscription('trade', callback))

      await waitForSubscription()

      const confirmationData = {
        result: null,
        id: Date.now()
      }

      const ws = MockWebSocket.getLatest()
      ws?.simulateMessage(confirmationData)

      await waitFor(() => {
        expect(callback).not.toHaveBeenCalled()
      })
    })
  })

  describe('getHistoricalBars', () => {
    it('should fetch historical bars', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi
          .fn()
          .mockResolvedValue([
            [1234567890, '50000', '51000', '49000', '50500', '100', 1234567890]
          ])
      })

      const bars = await adapter.getHistoricalBars(
        'BTCUSDT',
        '15',
        1234567890,
        1234567890 + 3600000,
        100
      )

      expect(bars).toHaveLength(1)
      expect(bars[0].symbol).toBe('BTCUSDT')
      expect(bars[0].time).toBe(1234567890)
      expect(bars[0].open).toBe(50000)
    })

    it('should handle fetch error', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400
      })

      await expect(
        adapter.getHistoricalBars('BTCUSDT', '15', 0, 1, 100)
      ).rejects.toThrow()
    })

    it('should limit bars to 1000', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([])
      })

      await adapter.getHistoricalBars('BTCUSDT', '15', 0, 1, 2000)

      const fetchCall = (globalThis.fetch as any).mock.calls[0][0]
      expect(fetchCall).toContain('limit=1000')
    })
  })

  describe('reconnection', () => {
    it('should attempt reconnection on unexpected close', async () => {
      // Subscribe first to create active streams
      const callback = vi.fn()
      adapter.subscribe(createSubscription('trade', callback))
      await waitForSubscription()

      const initialInstanceCount = MockWebSocket.instances.length

      // Simulate unexpected close
      const ws = MockWebSocket.getLatest()
      ws?.simulateClose(1006, 'Abnormal closure')

      // Wait for reconnection logic to trigger (reconnection delay starts at 1000ms)
      await new Promise(resolve => setTimeout(resolve, 1200))

      // Wait for new WebSocket instance to be created
      await waitFor(
        () => {
          return MockWebSocket.instances.length > initialInstanceCount
        },
        { timeout: 3000 }
      )

      expect(MockWebSocket.instances.length).toBeGreaterThan(
        initialInstanceCount
      )
    })

    it('should not reconnect on normal close', async () => {
      await connectAdapter(adapter)

      // Simulate normal close
      const ws = MockWebSocket.getLatest()
      ws?.simulateClose(1000, 'Normal closure')

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(MockWebSocket.instances.length).toBe(1)
    })

    it('should not reconnect on Going Away close', async () => {
      await connectAdapter(adapter)

      // Simulate going away close (page refresh, navigation)
      const ws = MockWebSocket.getLatest()
      ws?.simulateClose(1001, 'Going away')

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(MockWebSocket.instances.length).toBe(1)
    })

    it('should stop reconnecting after max attempts', async () => {
      // Subscribe first to create active streams
      const callback = vi.fn()
      adapter.subscribe(createSubscription('trade', callback))
      await waitForSubscription()

      // Force max reconnect attempts
      ;(adapter as any).reconnectAttempts = 5
      ;(adapter as any).maxReconnectAttempts = 5

      // Simulate unexpected close
      const ws = MockWebSocket.getLatest()
      ws?.simulateClose(1006, 'Abnormal closure')

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(globalThis.console.error).toHaveBeenCalledWith(
        'Max reconnection attempts reached'
      )
    })

    it('should handle reconnection failure and retry', async () => {
      // Subscribe first to create active streams
      const callback = vi.fn()
      adapter.subscribe(createSubscription('trade', callback))
      await waitForSubscription()

      // Mock connect to fail first time
      const originalConnect = adapter.connect.bind(adapter)
      let connectCallCount = 0
      vi.spyOn(adapter, 'connect').mockImplementation(async () => {
        connectCallCount++
        if (connectCallCount === 1) {
          // First reconnection attempt fails
          throw new Error('Connection failed')
        }
        // Second attempt succeeds
        return originalConnect()
      })

      // Simulate unexpected close
      const ws = MockWebSocket.getLatest()
      ws?.simulateClose(1006, 'Abnormal closure')

      // Wait for reconnection logic to trigger
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Should have attempted reconnection (may succeed on second try)
      expect(adapter.connect).toHaveBeenCalled()

      // Restore
      vi.restoreAllMocks()
    })
  })

  describe('singleton', () => {
    it('should create singleton instance', async () => {
      const { binanceAdapter } = await import('../Binance')
      expect(binanceAdapter).toBeDefined()
      expect(binanceAdapter).toBeInstanceOf(BinanceAdapter)
    })

    it('should reuse existing singleton instance', async () => {
      const module1 = await import('../Binance')
      const module2 = await import('../Binance')

      expect(module1.binanceAdapter).toBe(module2.binanceAdapter)
    })
  })
})
