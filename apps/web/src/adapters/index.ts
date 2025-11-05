/**
 * Exchange Adapter Manager
 * Manages different exchange adapters and handles switching between them
 */

import { Exchange } from '@/types/instrument'
import { binanceAdapter } from './Binance'

/**
 * Stream type enum
 */
export enum StreamType {
  KLINE = 'kline',
  DEPTH = 'depth',
  TRADE = 'trade'
}

/**
 * Base stream configuration without callback
 */
interface StreamConfig {
  symbol: string
  streamType: StreamType
  interval?: string // for kline streams
}

/**
 * Stream subscription with callback
 */
export interface StreamSubscription extends StreamConfig {
  callback: (data: any) => void
}

/**
 * Stream unsubscription - callback is optional
 */
export type StreamUnsubscription = StreamConfig & {
  callback?: (data: any) => void
}

export interface ExchangeAdapter {
  // Connection management
  connect(): Promise<void>
  // Dynamic subscription management
  subscribe(subscription: StreamSubscription): void
  unsubscribe(params: StreamUnsubscription): void
  // Historical data
  getHistoricalBars(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
    limit?: number
  ): Promise<any[]>
  getExchange(): string
}
export class ExchangeAdapterManager {
  private adapters = new Map<Exchange, ExchangeAdapter>()

  constructor() {
    // Initialize with default adapters
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
  unsubscribe(exchange: Exchange, params: StreamUnsubscription): void {
    const adapter = this.adapters.get(exchange)
    if (adapter) {
      adapter.unsubscribe(params)
    }
  }
}

// Singleton instance to survive hot reloads
// Use window object to persist across hot reloads
export const exchangeAdapterManager = (() => {
  if (!window.__exchangeAdapterManager) {
    window.__exchangeAdapterManager = new ExchangeAdapterManager()
  }
  return window.__exchangeAdapterManager
})()
