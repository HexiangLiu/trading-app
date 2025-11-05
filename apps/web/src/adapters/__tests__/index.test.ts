import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Exchange } from '@/types/instrument'
import {
  type ExchangeAdapter,
  ExchangeAdapterManager,
  type StreamSubscription,
  StreamType
} from '../index'

// Mock Binance adapter
vi.mock('../Binance')

describe('ExchangeAdapterManager', () => {
  let manager: ExchangeAdapterManager
  let mockBinanceAdapter: ExchangeAdapter

  beforeEach(async () => {
    // Get the mocked binanceAdapter
    const { binanceAdapter } = await import('../Binance')
    mockBinanceAdapter = binanceAdapter

    // Setup mock methods
    vi.mocked(mockBinanceAdapter.connect).mockResolvedValue(undefined)
    vi.mocked(mockBinanceAdapter.subscribe).mockImplementation(() => {})
    vi.mocked(mockBinanceAdapter.unsubscribe).mockImplementation(() => {})
    vi.mocked(mockBinanceAdapter.getHistoricalBars).mockResolvedValue([])
    vi.mocked(mockBinanceAdapter.getExchange).mockReturnValue('BINANCE')

    // Clear window singleton
    if (window.__exchangeAdapterManager) {
      delete window.__exchangeAdapterManager
    }
    manager = new ExchangeAdapterManager()
    vi.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with Binance adapter', () => {
      const adapter = manager.getAdapter(Exchange.BINANCE)
      expect(adapter).toBe(mockBinanceAdapter)
    })
  })

  describe('getAdapter', () => {
    it('should return existing adapter', () => {
      const adapter = manager.getAdapter(Exchange.BINANCE)
      expect(adapter).toBe(mockBinanceAdapter)
    })

    it('should create new adapter for known exchange', () => {
      // Test that getAdapter returns the same adapter instance
      const adapter1 = manager.getAdapter(Exchange.BINANCE)
      const adapter2 = manager.getAdapter(Exchange.BINANCE)
      expect(adapter1).toBe(adapter2)
      expect(adapter1).toBe(mockBinanceAdapter)
    })

    it('should fallback to Binance for unknown exchange', () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {})

      // Mock an unknown exchange
      const unknownExchange = 'UNKNOWN' as Exchange
      const adapter = manager.getAdapter(unknownExchange)

      expect(adapter).toBe(mockBinanceAdapter)
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Unknown exchange: UNKNOWN, falling back to Binance'
      )

      consoleWarnSpy.mockRestore()
    })
  })

  describe('subscribe', () => {
    it('should subscribe to a stream', () => {
      const subscription: StreamSubscription = {
        symbol: 'BTCUSDT',
        streamType: StreamType.TRADE,
        callback: vi.fn()
      }

      manager.subscribe(Exchange.BINANCE, subscription)

      expect(mockBinanceAdapter.subscribe).toHaveBeenCalledWith(subscription)
    })
  })

  describe('unsubscribe', () => {
    it('should unsubscribe from a stream when adapter exists', () => {
      manager.unsubscribe(Exchange.BINANCE, {
        symbol: 'BTCUSDT',
        streamType: StreamType.TRADE
      })

      expect(mockBinanceAdapter.unsubscribe).toHaveBeenCalledWith({
        symbol: 'BTCUSDT',
        streamType: StreamType.TRADE
      })
    })

    it('should not throw when adapter does not exist', () => {
      const unknownExchange = 'UNKNOWN' as Exchange

      expect(() => {
        manager.unsubscribe(unknownExchange, {
          symbol: 'BTCUSDT',
          streamType: StreamType.TRADE
        })
      }).not.toThrow()
    })

    it('should unsubscribe with callback when provided', () => {
      const callback = vi.fn()
      manager.unsubscribe(Exchange.BINANCE, {
        symbol: 'BTCUSDT',
        streamType: StreamType.TRADE,
        callback
      })

      expect(mockBinanceAdapter.unsubscribe).toHaveBeenCalledWith({
        symbol: 'BTCUSDT',
        streamType: StreamType.TRADE,
        callback
      })
    })
  })
})

describe('exchangeAdapterManager singleton', () => {
  beforeEach(() => {
    // Clean up singleton
    if (window.__exchangeAdapterManager) {
      delete window.__exchangeAdapterManager
    }
  })

  it('should create singleton instance', async () => {
    const { exchangeAdapterManager } = await import('../index')
    expect(exchangeAdapterManager).toBeDefined()
    expect(exchangeAdapterManager).toBeInstanceOf(ExchangeAdapterManager)
  })

  it('should reuse existing singleton instance', async () => {
    const module1 = await import('../index')
    const module2 = await import('../index')

    expect(module1.exchangeAdapterManager).toBe(module2.exchangeAdapterManager)
  })
})
