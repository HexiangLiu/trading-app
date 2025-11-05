/**
 * Real Datafeed for TradingView Chart
 * 函数式datafeed，支持一对多的adapter关系
 * 实现TradingView IBasicDataFeed接口
 */

import { exchangeAdapterManager, StreamType } from '@/adapters'
import type {
  DatafeedConfiguration,
  DatafeedErrorCallback,
  HistoryCallback,
  IBasicDataFeed,
  LibrarySymbolInfo,
  OnReadyCallback,
  PeriodParams,
  ResolutionString,
  ResolveCallback,
  SearchSymbolsCallback,
  SubscribeBarsCallback
} from '@/charting_library'
import type { Exchange } from '@/types/instrument'

export interface Bar {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  symbol?: string // 可选的symbol标识
}

export class Datafeed implements IBasicDataFeed {
  /**
   * TradingView Datafeed接口实现
   */
  onReady(callback: OnReadyCallback): void {
    console.log('Real Datafeed ready')

    const config: DatafeedConfiguration = {
      exchanges: [
        { value: 'Binance', name: 'Binance', desc: 'Binance Exchange' }
      ],
      symbols_types: [{ name: 'Crypto', value: 'crypto' }],
      supported_resolutions: [
        '1',
        '5',
        '15',
        '30',
        '60',
        '240',
        '1D'
      ] as ResolutionString[],
      supports_marks: false,
      supports_timescale_marks: false,
      supports_time: true
    }

    callback(config)
  }

  searchSymbols(
    _userInput: string,
    _exchange: string,
    _symbolType: string,
    _onResult: SearchSymbolsCallback
  ): void {}

  resolveSymbol(
    symbolName: string,
    onResolve: ResolveCallback,
    onError: DatafeedErrorCallback
  ): void {
    try {
      if (!symbolName || symbolName.trim() === '') {
        onError('Invalid symbol name')
        return
      }

      let ticker = symbolName
      let exchange = 'Binance'

      const parts = symbolName.split(':')
      exchange = parts[0]
      ticker = parts[1]

      const symbolInfo: LibrarySymbolInfo = {
        name: `${exchange}:${ticker}`,
        ticker: `${exchange}:${ticker}`,
        description: `${ticker} / USDT (${exchange})`,
        type: 'crypto',
        session: '24x7',
        timezone: 'Etc/UTC',
        exchange: exchange,
        listed_exchange: exchange,
        format: 'price',
        minmov: 1,
        pricescale: 100,
        has_intraday: true,
        has_weekly_and_monthly: true,

        supported_resolutions: [
          '1',
          '5',
          '60',
          '240',
          '1D'
        ] as ResolutionString[],
        volume_precision: 8,
        data_status: 'streaming'
      }
      console.log('resolve symbol:', symbolInfo)
      onResolve(symbolInfo)
    } catch (error) {
      console.error('Error resolving symbol:', error)
      onError('Failed to resolve symbol')
    }
  }

  getBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    periodParams: PeriodParams,
    onResult: HistoryCallback,
    onError: DatafeedErrorCallback
  ): void {
    try {
      // 从 symbolInfo 中获取 instrument 信息
      let symbol = symbolInfo.ticker || 'BTCUSDT'
      let exchange = symbolInfo.exchange || 'Binance'

      const parts = symbol.split(':')
      exchange = parts[0]
      symbol = parts[1]

      console.log('fetch historical bars:', symbol, exchange, resolution)

      const startTime = periodParams.from * 1000
      const endTime = periodParams.to * 1000

      const timeDiff = endTime - startTime
      const intervalMs = this.getIntervalMs(resolution)
      const limit = Math.min(Math.ceil(timeDiff / intervalMs), 1000)

      const adapter = exchangeAdapterManager.getAdapter(exchange as any)
      adapter
        .getHistoricalBars(symbol, resolution, startTime, endTime, limit)
        .then((bars: any[]) => {
          onResult(bars, { noData: bars.length === 0 })
        })
        .catch((error: any) => {
          console.error('Error fetching historical bars:', error)
          onError('Failed to fetch historical data')
        })
    } catch (error) {
      console.error('Error fetching historical bars:', error)
      onError('Failed to fetch historical data')
    }
  }

  /**
   * 获取间隔对应的毫秒数
   */
  private getIntervalMs(resolution: ResolutionString): number {
    const intervalMap: Record<string, number> = {
      '1': 60 * 1000, // 1分钟
      '5': 5 * 60 * 1000, // 5分钟
      '15': 15 * 60 * 1000, // 15分钟
      '30': 30 * 60 * 1000, // 30分钟
      '60': 60 * 60 * 1000, // 1小时
      '240': 4 * 60 * 60 * 1000, // 4小时
      '1D': 24 * 60 * 60 * 1000 // 1天
    }
    return intervalMap[resolution] || 4 * 60 * 60 * 1000 // 默认4小时
  }

  subscribeBars(
    _symbolInfo: LibrarySymbolInfo,
    resolution: ResolutionString,
    onRealtimeCallback: SubscribeBarsCallback,
    subscribeUID: string,
    _onResetCacheNeededCallback: () => void
  ): void {
    let symbol = _symbolInfo.ticker || 'BTCUSDT'
    let exchange = _symbolInfo.exchange || 'Binance'

    const parts = symbol.split(':')
    exchange = parts[0]
    symbol = parts[1]

    console.log('Subscribe bars:', subscribeUID, symbol, exchange, resolution)

    exchangeAdapterManager.subscribe(exchange as Exchange, {
      symbol: symbol,
      streamType: StreamType.KLINE,
      interval: resolution,
      callback: onRealtimeCallback
    })
  }

  unsubscribeBars(_subscribeUID: string): void {}
}

export const datafeed = new Datafeed()
