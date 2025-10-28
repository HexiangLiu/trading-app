/**
 * Exchange Adapter for Binance WebSocket Streams
 */

import type { OrderBookData } from '@/types/orderbook'
import { getTradeWorkerManager } from '@/workers/tradeWorkerManager'
import type { ExchangeAdapter, StreamSubscription } from '..'

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

export class BinanceAdapter implements ExchangeAdapter {
  // Static interval mapping from TradingView to Binance format
  private static readonly INTERVAL_MAP = {
    '1': '1m',
    '5': '5m',
    '15': '15m',
    '30': '30m',
    '60': '1h',
    '240': '4h',
    '1D': '1d'
  } as const

  private ws: WebSocket | null = null
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  // Active streams management
  private activeStreams = new Set<string>()
  private subscriptions = new Map<string, StreamSubscription[]>() // 支持多个订阅者
  private connectingPromise: Promise<void> | null = null // 防止重复连接

  private baseApiUrl: string
  private baseStreamUrl: string

  constructor(
    baseApiUrl: string = 'https://data-api.binance.vision',
    baseStreamUrl: string = 'wss://data-stream.binance.vision'
  ) {
    this.baseApiUrl = baseApiUrl
    this.baseStreamUrl = baseStreamUrl
  }
  // New interface methods
  subscribe(subscription: StreamSubscription): void {
    const streamName = this.getStreamName(
      subscription.symbol,
      subscription.streamType,
      subscription.interval
    )
    const subscriptionKey = this.getSubscriptionKey(
      subscription.symbol,
      subscription.streamType,
      subscription.interval
    )

    // Get existing subscriptions for this stream
    const streamSubscriptions = this.subscriptions.get(subscriptionKey) || []

    // Check if this exact subscription already exists (same callback)
    const existingSubscription = streamSubscriptions.find(
      sub => sub.callback === subscription.callback
    )
    if (existingSubscription) {
      console.log(`Callback already subscribed to stream: ${streamName}`)
      return
    }

    // Add new subscription to the list
    streamSubscriptions.push(subscription)
    this.subscriptions.set(subscriptionKey, streamSubscriptions)

    // Check if this is a new stream (first subscription for this stream)
    const isNewStream = !this.activeStreams.has(streamName)
    this.activeStreams.add(streamName)

    // If not connected, connect first
    if (!this.isConnected) {
      // Prevent multiple simultaneous connection attempts
      if (!this.connectingPromise) {
        this.connectingPromise = this.connect()
          .then(() => {
            console.log(`Connection established for stream: ${streamName}`)
            this.connectingPromise = null
          })
          .catch(error => {
            console.error('Failed to connect for subscription:', error)
            this.connectingPromise = null
          })
      }
    } else if (isNewStream) {
      // If already connected and this is a new stream, send SUBSCRIBE message
      console.log(`Sending SUBSCRIBE message for new stream: ${streamName}`)
      this.subscribeToStream(streamName)
    } else {
      console.log(`Stream ${streamName} already active, added new callback`)
    }
  }

  unsubscribe(
    symbol: string,
    streamType: 'kline' | 'depth' | 'trade',
    interval?: string,
    callback?: (data: any) => void
  ): void {
    const streamName = this.getStreamName(symbol, streamType, interval)
    const subscriptionKey = this.getSubscriptionKey(
      symbol,
      streamType,
      interval
    )

    // Get existing subscriptions for this stream
    const streamSubscriptions = this.subscriptions.get(subscriptionKey) || []

    if (callback) {
      // Remove specific callback subscription
      const filteredSubscriptions = streamSubscriptions.filter(
        sub => sub.callback !== callback
      )
      this.subscriptions.set(subscriptionKey, filteredSubscriptions)

      // If no more subscriptions for this stream, remove it
      if (filteredSubscriptions.length === 0) {
        this.subscriptions.delete(subscriptionKey)
        this.activeStreams.delete(streamName)

        // If connected, unsubscribe from stream
        if (this.isConnected && this.ws) {
          this.unsubscribeFromStream(streamName)
        }
      }
    } else {
      // Remove all subscriptions for this stream
      this.subscriptions.delete(subscriptionKey)
      this.activeStreams.delete(streamName)

      // If connected, unsubscribe from stream
      if (this.isConnected && this.ws) {
        this.unsubscribeFromStream(streamName)
      }
    }
  }

  unsubscribeAll(symbol: string): void {
    // Find all subscriptions for this symbol
    const subscriptionsToRemove: string[] = []

    for (const [key, subscriptions] of this.subscriptions) {
      // Check if any subscription in this stream matches the symbol
      if (subscriptions.some(sub => sub.symbol === symbol)) {
        subscriptionsToRemove.push(key)
      }
    }

    // Unsubscribe from all found subscriptions
    for (const key of subscriptionsToRemove) {
      const subscriptions = this.subscriptions.get(key)
      if (subscriptions && subscriptions.length > 0) {
        // Get the first subscription to extract stream info
        const firstSub = subscriptions[0]
        this.unsubscribe(
          firstSub.symbol,
          firstSub.streamType,
          firstSub.interval
        )
      }
    }
  }

  getExchange(): string {
    return 'BINANCE'
  }

  /**
   * Connect to WebSocket Streams
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        if (this.ws && this.isConnected) {
          console.log('already connected')
          resolve()
          return
        }

        // Connect to base WebSocket endpoint without any streams
        const url = `${this.baseStreamUrl}/ws`

        console.log('Connecting to:', url)
        this.ws = new WebSocket(url)

        this.ws.onopen = () => {
          console.log('Binance WebSocket connected')
          this.isConnected = true
          this.reconnectAttempts = 0

          // Subscribe to all active streams via SUBSCRIBE messages
          this.subscribeToAllActiveStreams()

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

          // Trigger reconnection for unexpected closures (not normal closure or going away)
          // 1000: Normal closure
          // 1001: Going away (page refresh, navigation)
          if (event.code !== 1000 && event.code !== 1001) {
            console.log(
              'Unexpected closure detected, triggering reconnection...'
            )
            this.handleReconnect()
          }
        }

        this.ws.onerror = error => {
          console.error('Binance WebSocket error:', error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Subscribe to all active streams via SUBSCRIBE messages
   */
  private subscribeToAllActiveStreams(): void {
    const allStreams = Array.from(this.activeStreams)
    if (allStreams.length === 0) {
      console.log('No active streams to subscribe to')
      return
    }

    console.log('Subscribing to all active streams:', allStreams)

    // Send SUBSCRIBE message for all active streams
    const subscribeMessage = {
      method: 'SUBSCRIBE',
      params: allStreams,
      id: Date.now()
    }

    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(subscribeMessage))
      console.log('Sent SUBSCRIBE message for streams:', allStreams)
    }
  }

  /**
   * Subscribe to a single stream via SUBSCRIBE message
   */
  private subscribeToStream(streamName: string): void {
    if (!this.ws || !this.isConnected) {
      console.warn(
        'WebSocket not connected, cannot subscribe to stream:',
        streamName
      )
      return
    }

    const subscribeMessage = {
      method: 'SUBSCRIBE',
      params: [streamName],
      id: Date.now()
    }

    this.ws.send(JSON.stringify(subscribeMessage))
    console.log('Sent SUBSCRIBE message for stream:', streamName)
  }

  /**
   * Get stream name for subscription
   */
  private getStreamName(
    symbol: string,
    streamType: 'kline' | 'depth' | 'trade',
    interval?: string
  ): string {
    const symbolLower = symbol.toLowerCase()

    switch (streamType) {
      case 'kline': {
        // Map TradingView interval to Binance interval
        const binanceInterval = interval
          ? BinanceAdapter.INTERVAL_MAP[
              interval as keyof typeof BinanceAdapter.INTERVAL_MAP
            ] || interval
          : '1m'
        return `${symbolLower}@kline_${binanceInterval}`
      }
      case 'depth':
        return `${symbolLower}@depth20@100ms`
      case 'trade':
        return `${symbolLower}@aggTrade`
      default:
        throw new Error(`Unsupported stream type: ${streamType}`)
    }
  }

  /**
   * Get subscription key for tracking
   */
  private getSubscriptionKey(
    symbol: string,
    streamType: 'kline' | 'depth' | 'trade',
    interval?: string
  ): string {
    // For kline streams, use the original interval for key consistency
    // The mapping to Binance format only happens in getStreamName
    return `${symbol}_${streamType}_${interval || ''}`
  }

  /**
   * Unsubscribe from a specific stream
   */
  private unsubscribeFromStream(streamName: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn(
        'WebSocket not connected, cannot unsubscribe from stream:',
        streamName
      )
      return
    }

    const unsubscribeMessage = {
      method: 'UNSUBSCRIBE',
      params: [streamName],
      id: Date.now()
    }

    this.ws.send(JSON.stringify(unsubscribeMessage))
    console.log('Unsubscribed from stream:', streamName)
  }

  /**
   * Handle WebSocket messages
   */
  private handleMessage(data: any): void {
    // Handle SUBSCRIBE/UNSUBSCRIBE confirmation messages
    if (data.result !== undefined && data.id !== undefined) {
      console.log('Received subscription confirmation:', data)
      return
    }

    // Handle raw data format (when using /ws endpoint)
    // For depth streams, data has format: {lastUpdateId: ..., bids: ..., asks: ...}
    if (data.lastUpdateId !== undefined && (data.bids || data.asks)) {
      // This is a depth stream data
      // We need to find which depth stream this belongs to
      // Since we can't determine the exact stream from raw data, we'll distribute to all depth subscriptions
      const depthSubscriptions = this.getSubscriptionsByType('depth')

      if (depthSubscriptions.length === 0) {
        console.warn('No depth subscriptions found for raw data')
        return
      }

      this.handleOrderBookStream(data, depthSubscriptions)
      return
    }

    // Handle kline data format
    if (data.e === 'kline') {
      // This is kline data
      const klineSubscriptions = this.getSubscriptionsByType('kline')

      if (klineSubscriptions.length === 0) {
        console.warn('No kline subscriptions found for raw data')
        return
      }

      this.handleKlineStream(data, klineSubscriptions)
      return
    }

    // Handle trade data format (both trade and aggTrade)
    if (data.e === 'trade' || data.e === 'aggTrade') {
      // This is trade data
      const tradeSubscriptions = this.getSubscriptionsByType('trade')

      if (tradeSubscriptions.length === 0) {
        console.warn('No trade subscriptions found for raw data')
        return
      }

      this.handleTradeStream(data, tradeSubscriptions)
      return
    }
  }

  /**
   * Get all subscriptions by stream type
   */
  private getSubscriptionsByType(
    streamType: 'kline' | 'depth' | 'trade'
  ): StreamSubscription[] {
    const result: StreamSubscription[] = []
    for (const subscriptions of this.subscriptions.values()) {
      for (const subscription of subscriptions) {
        if (subscription.streamType === streamType) {
          result.push(subscription)
        }
      }
    }
    return result
  }

  /**
   * Handle K-line data stream
   */
  private handleKlineStream(
    data: any,
    subscriptions: StreamSubscription[]
  ): void {
    // Handle both combined stream format (data.data) and raw data format (data)
    const klineData = data.data || data

    // Check if it's a K-line data stream
    if (klineData.e === 'kline') {
      const kline = this.parseKlineStream(klineData)

      // Convert to TradingView Bar format
      const bar = {
        time: kline.openTime,
        open: kline.open,
        high: kline.high,
        low: kline.low,
        close: kline.close,
        volume: kline.volume,
        symbol: subscriptions[0].symbol // Use first subscription's symbol
      }

      // Call all subscription callbacks
      subscriptions.forEach(subscription => {
        subscription.callback(bar)
      })
    }
  }

  /**
   * Handle Order Book data stream
   */
  private handleOrderBookStream(
    data: any,
    subscriptions: StreamSubscription[]
  ): void {
    // Handle both combined stream format (data.data) and raw data format (data)
    const orderBookData = data.data || data

    if (orderBookData) {
      const orderBook: OrderBookData = {
        lastUpdateId: orderBookData.lastUpdateId,
        bids: orderBookData.bids.map(([price, quantity]: [string, string]) => ({
          price,
          quantity
        })),
        asks: orderBookData.asks.map(([price, quantity]: [string, string]) => ({
          price,
          quantity
        })),
        symbol: subscriptions[0].symbol, // Use first subscription's symbol
        timestamp: Date.now()
      }

      // Call all subscription callbacks
      subscriptions.forEach(subscription => {
        try {
          subscription.callback(orderBook)
        } catch (error) {
          console.error(
            'BinanceAdapter: Error calling order book callback:',
            error
          )
        }
      })
    }
  }

  /**
   * Handle Trade data stream
   */
  private handleTradeStream(
    data: any,
    subscriptions: StreamSubscription[]
  ): void {
    // Handle both combined stream format (data.data) and raw data format (data)
    const tradeData = data.data || data

    if (tradeData && (tradeData.e === 'aggTrade' || tradeData.e === 'trade')) {
      // Convert to standard trade format
      const trade = {
        symbol: tradeData.s, // Symbol
        price: parseFloat(tradeData.p), // Price
        quantity: parseFloat(tradeData.q), // Quantity
        timestamp: tradeData.T, // Trade time
        isBuyerMaker: tradeData.m, // Is buyer maker
        firstTradeId: tradeData.f, // First trade ID (for aggTrade)
        lastTradeId: tradeData.l, // Last trade ID (for aggTrade)
        tradeCount: tradeData.n // Number of trades (for aggTrade)
      }

      // Send to Worker for aggregation
      try {
        const workerManager = getTradeWorkerManager()
        if (workerManager.initialized) {
          workerManager.sendTradeData(trade)
        } else {
          console.warn('Worker not initialized, cannot send trade data')
        }
      } catch (error) {
        console.error('Failed to send trade data to worker:', error)
      }

      // Call all subscription callbacks (for backward compatibility)
      subscriptions.forEach(subscription => {
        try {
          subscription.callback(trade)
        } catch (error) {
          console.error('BinanceAdapter: Error calling trade callback:', error)
        }
      })
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
      isClosed: k.x
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
      // Reconnect with current active streams
      this.connect()
        .then(() => {
          console.log(
            'Reconnected successfully with streams:',
            Array.from(this.activeStreams)
          )
        })
        .catch(error => {
          console.error('Reconnection failed:', error)
          this.handleReconnect()
        })
    }, delay)
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
        limit: Math.min(limit, 1000).toString() // Binance supports up to 1000 bars
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
        symbol: symbol
      }))
    } catch (error) {
      console.error('Failed to fetch historical data:', error)
      throw error
    }
  }
}

// Singleton instance to survive hot reloads
// Use window object to persist across hot reloads
export const binanceAdapter = (() => {
  if (!window.__binanceAdapter) {
    window.__binanceAdapter = new BinanceAdapter()
  }
  return window.__binanceAdapter
})()
