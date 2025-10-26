/**
 * Exchange Adapter Manager
 * Manages different exchange adapters and handles switching between them
 */

import { Exchange } from '@/types/instrument'
import { binanceAdapter } from './Binance'

export interface StreamSubscription {
  symbol: string
  streamType: 'kline' | 'depth' | 'trade'
  interval?: string // for kline streams
  callback: (data: any) => void
}

export interface ExchangeAdapter {
  // Connection management
  connect(): Promise<void>
  disconnect(): void
  getConnectionStatus(): boolean

  // Dynamic subscription management
  subscribe(subscription: StreamSubscription): void
  unsubscribe(
    symbol: string,
    streamType: 'kline' | 'depth' | 'trade',
    interval?: string,
    callback?: (data: any) => void
  ): void
  unsubscribeAll(symbol: string): void

  // Historical data
  getHistoricalBars(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
    limit?: number
  ): Promise<any[]>

  // Utility methods
  getActiveStreams(): string[]
  getExchange(): string
}
export class ExchangeAdapterManager {
  private adapters = new Map<Exchange, ExchangeAdapter>()

  constructor() {
    // Initialize with default adapter
    this.adapters.set(Exchange.BINANCE, binanceAdapter)
  }

  /**
   * Get or create adapter for specific exchange
   */
  getAdapter(exchange: Exchange): ExchangeAdapter {
    let adapter = this.adapters.get(exchange)
    if (!adapter) {
      adapter = this.createAdapter(exchange)
      this.adapters.set(exchange, adapter)
    }
    return adapter
  }

  /**
   * Create new adapter instance for exchange
   */
  private createAdapter(exchange: Exchange): ExchangeAdapter {
    switch (exchange) {
      case Exchange.BINANCE:
        return binanceAdapter
      // Add more exchanges here in the future
      // case Exchange.BYBIT:
      //   return new BybitAdapter()
      // case Exchange.OKX:
      //   return new OkxAdapter()
      default:
        console.warn(`Unknown exchange: ${exchange}, falling back to Binance`)
        return binanceAdapter
    }
  }

  /**
   * Subscribe to a stream for specific exchange
   */
  subscribe(exchange: Exchange, subscription: StreamSubscription): void {
    const adapter = this.getAdapter(exchange)
    adapter.subscribe(subscription)
  }

  /**
   * Unsubscribe from a stream for specific exchange
   */
  unsubscribe(
    exchange: Exchange,
    symbol: string,
    streamType: 'kline' | 'depth' | 'trade',
    interval?: string,
    callback?: (data: any) => void
  ): void {
    const adapter = this.adapters.get(exchange)
    if (adapter) {
      adapter.unsubscribe(symbol, streamType, interval, callback)

      // Auto-disconnect if no active streams
      if (adapter.getActiveStreams().length === 0) {
        adapter.disconnect()
        this.adapters.delete(exchange)
      }
    }
  }

  /**
   * Unsubscribe from all streams for a symbol
   */
  unsubscribeAll(exchange: Exchange, symbol: string): void {
    const adapter = this.adapters.get(exchange)
    if (adapter) {
      adapter.unsubscribeAll(symbol)

      // Auto-disconnect if no active streams
      if (adapter.getActiveStreams().length === 0) {
        adapter.disconnect()
        this.adapters.delete(exchange)
      }
    }
  }

  /**
   * Get connection status for specific exchange
   */
  getConnectionStatus(exchange: Exchange): boolean {
    const adapter = this.adapters.get(exchange)
    return adapter?.getConnectionStatus() ?? false
  }

  /**
   * Disconnect specific exchange
   */
  disconnect(exchange: Exchange): void {
    const adapter = this.adapters.get(exchange)
    if (adapter) {
      adapter.disconnect()
      this.adapters.delete(exchange)
    }
  }

  /**
   * Disconnect all exchanges
   */
  disconnectAll(): void {
    for (const [, adapter] of this.adapters) {
      adapter.disconnect()
    }
    this.adapters.clear()
  }

  /**
   * Get all active adapters
   */
  getActiveAdapters(): Map<Exchange, ExchangeAdapter> {
    return new Map(this.adapters)
  }
}

// Export singleton instance
export const exchangeAdapterManager = new ExchangeAdapterManager()
