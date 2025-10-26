/**
 * Exchange Adapter Manager
 * Manages different exchange adapters and handles switching between them
 */

import { Exchange, type Instrument } from '@/types/instrument'
import { binanceAdapter } from './Binance'

export interface ExchangeAdapter {
  connect(instrument: Instrument, interval?: string): Promise<void>
  disconnect(): void
  switchInstrument(symbol: string): Promise<void>
  switchInterval(symbol: string, interval: string): Promise<void>
  getCurrentSymbol(): string
  getCurrentInterval(): string
  getConnectionStatus(): boolean
  setBarUpdateCallback(callback: (bar: any) => void): void
  setOrderBookCallback(callback: (orderBook: any) => void): void
  getHistoricalBars(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
    limit?: number
  ): Promise<any[]>
}

export class ExchangeAdapterManager {
  private currentAdapter: ExchangeAdapter | null = null
  private currentInstrument: Instrument | null = null

  constructor() {
    // Initialize with default adapter
    this.currentAdapter = binanceAdapter
  }

  /**
   * Connect to an instrument
   * This will establish the initial connection
   */
  async connect(
    instrument: Instrument,
    interval: string = '4h'
  ): Promise<void> {
    console.log(
      'Connecting to instrument:',
      instrument,
      'with interval:',
      interval
    )

    this.currentInstrument = instrument

    // Get the appropriate adapter for this exchange
    this.currentAdapter = this.getAdapterForExchange(instrument.exchange)

    // Connect to the instrument
    if (this.currentAdapter) {
      await this.currentAdapter.connect(instrument, interval)
    }
  }

  /**
   * Switch to a new instrument
   * This will either switch the WebSocket URL or replace the entire adapter
   */
  async switchInstrument(instrument: Instrument): Promise<void> {
    if (this.currentInstrument === instrument) {
      return
    }
    this.currentInstrument = instrument

    // Disconnect current adapter if connected
    if (this.currentAdapter) {
      console.log('disconnect current adapter')
      this.currentAdapter.disconnect()
    }

    // Determine if we need to switch adapter or just update the connection
    const needsNewAdapter =
      this.currentInstrument?.exchange !== instrument.exchange

    if (needsNewAdapter) {
      // Switch to a different exchange adapter
      this.currentAdapter = this.getAdapterForExchange(instrument.exchange)
      console.log('Switched to new adapter for exchange:', instrument.exchange)
    }

    // Use the adapter's switchInstrument method
    if (this.currentAdapter) {
      await this.currentAdapter.switchInstrument(instrument.name)
    }
  }

  /**
   * Switch time interval for current instrument
   */
  async switchInterval(interval: string): Promise<void> {
    if (!this.currentAdapter || !this.currentInstrument) {
      console.warn('No adapter or instrument selected')
      return
    }

    await this.currentAdapter.switchInterval(
      this.currentInstrument.name,
      interval
    )
  }

  /**
   * Get current instrument
   */
  getCurrentInstrument(): Instrument | null {
    return this.currentInstrument
  }

  /**
   * Get current adapter
   */
  getCurrentAdapter(): ExchangeAdapter | null {
    return this.currentAdapter
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.currentAdapter?.getConnectionStatus() ?? false
  }

  /**
   * Disconnect current adapter
   */
  disconnect(): void {
    if (this.currentAdapter) {
      this.currentAdapter.disconnect()
    }
  }

  /**
   * Get adapter for specific exchange
   */
  private getAdapterForExchange(exchange: Exchange): ExchangeAdapter {
    switch (exchange) {
      case Exchange.BINANCE:
        return binanceAdapter
      // Add more exchanges here in the future
      // case Exchange.BYBIT:
      //   return bybitAdapter;
      // case Exchange.OKX:
      //   return okxAdapter;
      default:
        console.warn(`Unknown exchange: ${exchange}, falling back to Binance`)
        return binanceAdapter
    }
  }
}

// Export singleton instance
export const exchangeAdapterManager = new ExchangeAdapterManager()
