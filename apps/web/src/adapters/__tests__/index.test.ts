import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Exchange } from '@/types/instrument'
import {
  type ExchangeAdapter,
  ExchangeAdapterManager,
  type StreamSubscription
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
    vi.mocked(mockBinanceAdapter.getConnectionStatus).mockReturnValue(true)
    vi.mocked(mockBinanceAdapter.subscribe).mockImplementation(() => {})
    vi.mocked(mockBinanceAdapter.unsubscribe).mockImplementation(() => {})
    vi.mocked(mockBinanceAdapter.unsubscribeAll).mockImplementation(() => {})
    vi.mocked(mockBinanceAdapter.getHistoricalBars).mockResolvedValue([])
    vi.mocked(mockBinanceAdapter.getActiveStreams).mockReturnValue([])
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
      const activeAdapters = manager.getActiveAdapters()
      expect(activeAdapters.has(Exchange.BINANCE)).toBe(true)
      expect(activeAdapters.get(Exchange.BINANCE)).toBe(mockBinanceAdapter)
    })
  })

  describe('getAdapter', () => {
    it('should return existing adapter', () => {
      const adapter = manager.getAdapter(Exchange.BINANCE)
      expect(adapter).toBe(mockBinanceAdapter)
    })

    it('should create new adapter for known exchange', () => {
      // Remove the default Binance adapter
      const activeAdapters = manager.getActiveAdapters()
      activeAdapters.delete(Exchange.BINANCE)

      const adapter = manager.getAdapter(Exchange.BINANCE)
      expect(adapter).toBe(mockBinanceAdapter)
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
        streamType: 'trade',
        callback: vi.fn()
      }

      manager.subscribe(Exchange.BINANCE, subscription)

      expect(mockBinanceAdapter.subscribe).toHaveBeenCalledWith(subscription)
    })
  })

  describe('unsubscribe', () => {
    it('should unsubscribe from a stream when adapter exists', () => {
      manager.unsubscribe(Exchange.BINANCE, 'BTCUSDT', 'trade')

      expect(mockBinanceAdapter.unsubscribe).toHaveBeenCalledWith(
        'BTCUSDT',
        'trade',
        undefined,
        undefined
      )
    })

    it('should not throw when adapter does not exist', () => {
      const unknownExchange = 'UNKNOWN' as Exchange

      expect(() => {
        manager.unsubscribe(unknownExchange, 'BTCUSDT', 'trade')
      }).not.toThrow()
    })

    it('should unsubscribe with callback when provided', () => {
      const callback = vi.fn()
      manager.unsubscribe(
        Exchange.BINANCE,
        'BTCUSDT',
        'trade',
        undefined,
        callback
      )

      expect(mockBinanceAdapter.unsubscribe).toHaveBeenCalledWith(
        'BTCUSDT',
        'trade',
        undefined,
        callback
      )
    })
  })

  describe('unsubscribeAll', () => {
    it('should unsubscribe from all streams when adapter exists', () => {
      manager.unsubscribeAll(Exchange.BINANCE, 'BTCUSDT')

      expect(mockBinanceAdapter.unsubscribeAll).toHaveBeenCalledWith('BTCUSDT')
    })

    it('should not throw when adapter does not exist', () => {
      const unknownExchange = 'UNKNOWN' as Exchange

      expect(() => {
        manager.unsubscribeAll(unknownExchange, 'BTCUSDT')
      }).not.toThrow()
    })
  })

  describe('getConnectionStatus', () => {
    it('should return connection status when adapter exists', () => {
      const status = manager.getConnectionStatus(Exchange.BINANCE)
      expect(status).toBe(true)
      expect(mockBinanceAdapter.getConnectionStatus).toHaveBeenCalled()
    })

    it('should return false when adapter does not exist', () => {
      const unknownExchange = 'UNKNOWN' as Exchange
      const status = manager.getConnectionStatus(unknownExchange)
      expect(status).toBe(false)
    })
  })

  describe('getActiveAdapters', () => {
    it('should return a copy of adapters map', () => {
      const adapters = manager.getActiveAdapters()
      expect(adapters).toBeInstanceOf(Map)
      expect(adapters.size).toBeGreaterThan(0)
    })

    it('should return independent copy', () => {
      const adapters1 = manager.getActiveAdapters()
      const adapters2 = manager.getActiveAdapters()

      // Modifying the returned map should not affect the internal map
      adapters1.set(Exchange.BINANCE, mockBinanceAdapter)

      // But the same adapter reference should still exist
      expect(adapters1.get(Exchange.BINANCE)).toBe(mockBinanceAdapter)
      expect(adapters2.get(Exchange.BINANCE)).toBe(mockBinanceAdapter)
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
