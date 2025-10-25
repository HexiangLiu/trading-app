/**
 * Exchange Adapter for Binance WebSocket Streams
 * 基于 https://developers.binance.com/docs/binance-spot-api-docs/web-socket-streams#klinecandlestick-streams-with-timezone-offset
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
  private ws: WebSocket | null = null
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private streams: string[] = []
  private currentSymbol = 'BTCUSDT'
  private currentInterval = '4h'
  private barUpdateCallback: ((bar: any) => void) | null = null

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

  /**
   * 连接到WebSocket Streams
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

        // 构建stream名称
        const streamName = `${instrument.name.toLowerCase()}@kline_${interval}`
        const url = `${this.baseStreamUrl}/stream?streams=${streamName}`

        console.log('Connecting to:', url)
        this.ws = new WebSocket(url)
        this.streams = [streamName]
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
   * 断开连接
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.isConnected = false
    this.streams = []
  }

  /**
   * 处理WebSocket消息
   */
  private handleMessage(data: any): void {
    // 处理Combined stream格式: {"stream":"<streamName>","data":<rawPayload>}
    if (data.stream && data.data) {
      this.handleKlineStream(data)
    }
  }

  /**
   * 处理K线数据流
   */
  private handleKlineStream(data: any): void {
    const streamName = data.stream
    const klineData = data.data

    // 检查是否是K线数据流
    if (streamName.includes('@kline_') && klineData.e === 'kline') {
      const kline = this.parseKlineStream(klineData)

      // 转换为TradingView Bar格式
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
   * 解析K线数据流
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
   * 处理重连逻辑
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
      // 重连时使用当前symbol和interval
      const instrument = {
        name: this.currentSymbol as InstrumentName,
        exchange: Exchange.BINANCE,
      }
      this.connect(instrument, this.currentInterval)
        .then(() => {
          console.log('Reconnected successfully')
        })
        .catch(error => {
          console.error('Reconnection failed:', error)
          this.handleReconnect()
        })
    }, delay)
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * 获取当前连接的流
   */
  getStreams(): string[] {
    return [...this.streams]
  }

  /**
   * 切换交易对
   */
  async switchInstrument(symbol: string): Promise<void> {
    console.log(`Switching instrument to ${symbol}`)

    this.currentSymbol = symbol

    // 断开当前连接
    this.disconnect()

    // 重新连接新的流（使用当前interval）
    const instrument = {
      name: symbol as InstrumentName,
      exchange: Exchange.BINANCE,
    }
    await this.connect(instrument, this.currentInterval)
  }

  /**
   * 切换时间间隔
   */
  async switchInterval(symbol: string, interval: string): Promise<void> {
    const intervalMap = {
      '1': '1m',
      '5': '5m',
      '60': '1h',
      '240': '4h',
      '1D': '1d',
    } as const
    const mappedInterval = intervalMap[interval as keyof typeof intervalMap]
    console.log(`Switching to ${symbol} ${mappedInterval}`)

    this.currentSymbol = symbol
    this.currentInterval = mappedInterval

    // 断开当前连接
    this.disconnect()

    // 重新连接新的流
    const instrument = {
      name: symbol as InstrumentName,
      exchange: Exchange.BINANCE,
    }
    await this.connect(instrument, mappedInterval)
  }

  /**
   * 获取当前symbol和interval
   */
  getCurrentSymbol(): string {
    return this.currentSymbol
  }

  getCurrentInterval(): string {
    return this.currentInterval
  }

  /**
   * 获取历史K线数据
   * 使用Binance REST API的uiKlines端点
   */
  async getHistoricalBars(
    symbol: string,
    interval: string,
    startTime: number,
    endTime: number,
    limit: number = 1000
  ): Promise<any[]> {
    try {
      // 映射TradingView间隔到Binance间隔
      const intervalMap = {
        '1': '1m',
        '5': '5m',
        '15': '15m',
        '30': '30m',
        '60': '1h',
        '240': '4h',
        '1D': '1d',
      } as const

      const binanceInterval =
        intervalMap[interval as keyof typeof intervalMap] || '4h'

      // 构建API URL
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

      // 转换Binance数据格式到TradingView格式
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
