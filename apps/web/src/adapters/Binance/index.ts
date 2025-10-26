/**
 * Exchange Adapter for Binance WebSocket Streams
 * Based on https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams#klinecandlestick-streams-with-timezone-offset
 */

import type { Instrument, InstrumentName } from '@/types/instrument'
import { Exchange } from '@/types/instrument'
import type { ExchangeAdapter } from '..'

export interface KlineData {
  openTime: number
  closeTime: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  quoteVolume: number
  trades: number
  buyBaseVolume: number
  buyQuoteVolume: number
  isClosed: boolean
}

export interface OrderBookEntry {
  price: string
  quantity: string
}

export interface OrderBookData {
  lastUpdateId: number
  bids: OrderBookEntry[]
  asks: OrderBookEntry[]
  symbol: string
  timestamp: number
}

export interface BinanceKlineStream {
  e: string // Event type
  E: number // Event time
  s: string // Symbol
  k: {
    t: number // Kline start time
    T: number // Kline close time
    s: string // Symbol
    i: string // Interval
    f: number // First trade ID
    L: number // Last trade ID
    o: string // Open price
    c: string // Close price
    h: string // High price
    l: string // Low price
    v: string // Volume
    n: number // Number of trades
    x: boolean // Is this kline closed?
    q: string // Quote asset volume
    V: string // Taker buy base asset volume
    Q: string // Taker buy quote asset volume
    B: string // Ignore
  }
}

export interface BinanceOrderBookStream {
  lastUpdateId: number
  bids: [string, string][] // [price, quantity]
  asks: [string, string][] // [price, quantity]
}

export class BinanceAdapter implements ExchangeAdapter {
  // Static interval mapping from TradingView to Binance format
  private static readonly INTERVAL_MAP = {
    '1': '1m',
    '5': '5m',
    '15': '15m',
    '30': '30m',
    '60': '1h',
    '240': '4h',
    '1D': '1d',
  } as const

  private ws: WebSocket | null = null
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private klineStreams: string[] = []
  private currentSymbol = 'BTCUSDT'
  private currentInterval = '4h'
  private barUpdateCallback: ((bar: any) => void) | null = null
  private orderBookCallback: ((orderBook: OrderBookData) => void) | null = null
  private orderBookStreams: string[] = []

  private baseApiUrl: string
  private baseStreamUrl: string

  constructor(
    baseApiUrl: string = 'https://data-api.binance.vision',
    baseStreamUrl: string = 'wss://data-stream.binance.vision'
  ) {
    this.baseApiUrl = baseApiUrl
    this.baseStreamUrl = baseStreamUrl
  }
  setBarUpdateCallback(callback: (bar: any) => void): void {
    this.barUpdateCallback = callback
  }

  setOrderBookCallback(callback: (orderBook: OrderBookData) => void): void {
    this.orderBookCallback = callback
  }

  /**
   * Connect to WebSocket Streams
   */
  async connect(
    instrument: Instrument,
    interval: string = '4h'
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.ws) {
          console.log('already connected')
          resolve()
          return
        }

        // Build stream names
        const klineStreamName = `${instrument.name.toLowerCase()}@kline_${interval}`
        const orderBookStreamName = `${instrument.name.toLowerCase()}@depth20@100ms`
        const allStreams = [klineStreamName, orderBookStreamName]
        const streamsParam = allStreams.join('/')
        const url = `${this.baseStreamUrl}/stream?streams=${streamsParam}`

        console.log('Connecting to:', url)
        this.ws = new WebSocket(url)
        this.klineStreams = [klineStreamName]
        this.orderBookStreams = [orderBookStreamName]
        this.currentSymbol = instrument.name
        this.currentInterval = interval

        this.ws.onopen = () => {
          console.log('Binance WebSocket Streams connected')
          this.isConnected = true
          this.reconnectAttempts = 0
          resolve()
        }

        this.ws.onmessage = event => {
          try {
            const data = JSON.parse(event.data)
            this.handleMessage(data)
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        this.ws.onclose = event => {
          console.log('Binance WebSocket closed:', event.code, event.reason)
          this.isConnected = false
        }

        this.ws.onerror = error => {
          console.error('Binance WebSocket error:', error)
          reject(error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isConnected = false
    this.klineStreams = []
    this.orderBookStreams = []
  }

  /**
   * Handle WebSocket messages
   */
  private handleMessage(data: any): void {
    // Handle Combined stream format: {"stream":"<streamName>","data":<rawPayload>}
    if (data.stream && data.data) {
      const streamName = data.stream

      // Handle K-line data stream
      if (streamName.includes('@kline_')) {
        this.handleKlineStream(data)
      }
      // Handle Order Book data stream
      else if (streamName.includes('@depth')) {
        this.handleOrderBookStream(data)
      }
    }
  }

  /**
   * Handle K-line data stream
   */
  private handleKlineStream(data: any): void {
    const streamName = data.stream
    const klineData = data.data

    // Check if it's a K-line data stream
    if (streamName.includes('@kline_') && klineData.e === 'kline') {
      const kline = this.parseKlineStream(klineData)

      // Convert to TradingView Bar format
      const bar = {
        time: kline.openTime,
        open: kline.open,
        high: kline.high,
        low: kline.low,
        close: kline.close,
        volume: kline.volume,
        symbol: this.currentSymbol,
      }
      this.barUpdateCallback?.(bar)
    }
  }

  /**
   * Handle Order Book data stream
   */
  private handleOrderBookStream(data: any): void {
    const orderBookData = data.data

    if (orderBookData && this.orderBookCallback) {
      const orderBook: OrderBookData = {
        lastUpdateId: orderBookData.lastUpdateId,
        bids: orderBookData.bids.map(([price, quantity]: [string, string]) => ({
          price,
          quantity,
        })),
        asks: orderBookData.asks.map(([price, quantity]: [string, string]) => ({
          price,
          quantity,
        })),
        symbol: this.currentSymbol,
        timestamp: Date.now(),
      }

      this.orderBookCallback(orderBook)
    }
  }

  /**
   * Parse K-line data stream
   */
  private parseKlineStream(data: BinanceKlineStream): KlineData {
    const k = data.k

    return {
      openTime: k.t,
      closeTime: k.T,
      open: parseFloat(k.o),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      close: parseFloat(k.c),
      volume: parseFloat(k.v),
      quoteVolume: parseFloat(k.q),
      trades: k.n,
      buyBaseVolume: parseFloat(k.V),
      buyQuoteVolume: parseFloat(k.Q),
      isClosed: k.x,
    }
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * 2 ** (this.reconnectAttempts - 1)

    console.log(
      `Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`
    )

    setTimeout(() => {
      // Use current symbol and interval for reconnection
      const instrument = {
        name: this.currentSymbol as InstrumentName,
        exchange: Exchange.BINANCE,
      }
      this.connect(instrument, this.currentInterval)
        .then(() => {
          console.log(
            'Reconnected successfully with streams:',
            this.klineStreams,
            this.orderBookStreams
          )
        })
        .catch(error => {
          console.error('Reconnection failed:', error)
          this.handleReconnect()
        })
    }, delay)
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * Get currently connected streams
   */
  getStreams(): string[] {
    return [...this.klineStreams]
  }

  /**
   * Switch trading instrument
   */
  async switchInstrument(symbol: string): Promise<void> {
    console.log(`Switching instrument to ${symbol}`)

    this.currentSymbol = symbol

    // Disconnect current connection
    this.disconnect()

    // Reconnect with new stream (using current interval)
    const instrument = {
      name: symbol as InstrumentName,
      exchange: Exchange.BINANCE,
    }
    await this.connect(instrument, this.currentInterval)
  }

  /**
   * Switch time interval
   * Only update K-line stream, keep Order Book stream unchanged
   */
  async switchInterval(symbol: string, interval: string): Promise<void> {
    const mappedInterval =
      BinanceAdapter.INTERVAL_MAP[
        interval as keyof typeof BinanceAdapter.INTERVAL_MAP
      ]
    console.log(`Switching to ${symbol} ${mappedInterval}`)

    this.currentSymbol = symbol

    // If WebSocket is connected, use subscribe/unsubscribe mechanism
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      await this.updateKlineStream(symbol, mappedInterval)
    } else {
      // If not connected, reconnect all streams
      const instrument = {
        name: symbol as InstrumentName,
        exchange: Exchange.BINANCE,
      }
      await this.connect(instrument, mappedInterval)
    }
  }

  /**
   * Update K-line stream, keep Order Book stream unchanged
   */
  private async updateKlineStream(
    symbol: string,
    interval: string
  ): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, cannot update Kline stream')
      return
    }

    try {
      // Unsubscribe from old K-line stream
      const oldKlineStream = `${this.currentSymbol.toLowerCase()}@kline_${this.currentInterval}`
      const unsubscribeMessage = {
        method: 'UNSUBSCRIBE',
        params: [oldKlineStream],
        id: Date.now(),
      }
      this.ws.send(JSON.stringify(unsubscribeMessage))
      console.log('Unsubscribed from old Kline stream:', oldKlineStream)

      // Subscribe to new K-line stream
      const newKlineStream = `${symbol.toLowerCase()}@kline_${interval}`
      const subscribeMessage = {
        method: 'SUBSCRIBE',
        params: [newKlineStream],
        id: Date.now() + 1,
      }
      this.ws.send(JSON.stringify(subscribeMessage))
      console.log('Subscribed to new Kline stream:', newKlineStream)

      // Update klineStreams array and current interval
      this.klineStreams = [newKlineStream]
      this.currentInterval = interval
    } catch (error) {
      console.error('Error updating Kline stream:', error)
      // If update fails, fallback to reconnection
      this.disconnect()
      const instrument = {
        name: symbol as InstrumentName,
        exchange: Exchange.BINANCE,
      }
      await this.connect(instrument, interval)
    }
  }

  /**
   * Get current symbol and interval
   */
  getCurrentSymbol(): string {
    return this.currentSymbol
  }

  getCurrentInterval(): string {
    return this.currentInterval
  }

  /**
   * Get historical K-line data
   * Using Binance REST API uiKlines endpoint
   */
  async getHistoricalBars(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
    limit: number = 1000
  ): Promise<any[]> {
    try {
      // Map TradingView interval to Binance interval
      const binanceInterval =
        BinanceAdapter.INTERVAL_MAP[
          interval as keyof typeof BinanceAdapter.INTERVAL_MAP
        ] || '4h'

      // Build API URL
      const endpoint = '/api/v3/uiKlines'
      const params = new URLSearchParams({
        symbol: symbol.toUpperCase(),
        interval: binanceInterval,
        startTime: startTime.toString(),
        endTime: endTime.toString(),
        limit: Math.min(limit, 1000).toString(), // Binance supports up to 1000 bars
      })

      const url = `${this.baseApiUrl}${endpoint}?${params}`
      console.log('Fetching historical data from:', url)

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      // Convert Binance data format to TradingView format
      return data.map((kline: any[]) => ({
        time: kline[0], // Kline open time
        open: parseFloat(kline[1]), // Open price
        high: parseFloat(kline[2]), // High price
        low: parseFloat(kline[3]), // Low price
        close: parseFloat(kline[4]), // Close price
        volume: parseFloat(kline[5]), // Volume
        symbol: symbol,
      }))
    } catch (error) {
      console.error('Failed to fetch historical data:', error)
      throw error
    }
  }
}

export const binanceAdapter = new BinanceAdapter()
