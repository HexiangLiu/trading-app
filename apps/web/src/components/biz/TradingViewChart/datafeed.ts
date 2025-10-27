/**
 * Real Datafeed for TradingView Chart
 * 函数式datafeed，支持一对多的adapter关系
 * 实现TradingView IBasicDataFeed接口
 */

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
  constructor() {
    // 不需要任何配置，单实例
  }

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

      if (symbolName.includes(':')) {
        const parts = symbolName.split(':')
        exchange = parts[0]
        ticker = parts[1]
      }

      const symbolInfo: LibrarySymbolInfo = {
        name: ticker,
        ticker: ticker,
        description: `${ticker} / USDT`,
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
      const symbol = symbolInfo.ticker || 'BTCUSDT'
      const exchange = symbolInfo.exchange || 'Binance'

      const startTime = periodParams.from * 1000
      const endTime = periodParams.to * 1000

      const timeDiff = endTime - startTime
      const intervalMs = this.getIntervalMs(resolution)
      const limit = Math.min(Math.ceil(timeDiff / intervalMs), 1000)

      // Import exchangeAdapterManager here to avoid circular dependency
      import('@/adapters')
        .then(({ exchangeAdapterManager }) => {
          const adapter = exchangeAdapterManager.getAdapter(exchange as any)
          return adapter.getHistoricalBars(
            symbol,
            resolution,
            startTime,
            endTime,
            limit
          )
        })
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
    console.log('Subscribe bars:', subscribeUID)

    // 从 symbolInfo 中获取 instrument 信息
    const symbol = _symbolInfo.ticker || 'BTCUSDT'
    const exchange = _symbolInfo.exchange || 'Binance'

    // Import exchangeAdapterManager here to avoid circular dependency
    import('@/adapters').then(({ exchangeAdapterManager }) => {
      exchangeAdapterManager.subscribe(exchange as any, {
        symbol: symbol,
        streamType: 'kline',
        interval: this.mapResolutionToInterval(resolution),
        callback: onRealtimeCallback
      })
    })
  }

  private mapResolutionToInterval(resolution: ResolutionString): string {
    const intervalMap: Record<string, string> = {
      '1': '1m',
      '5': '5m',
      '15': '15m',
      '30': '30m',
      '60': '1h',
      '240': '4h',
      '1D': '1d'
    }
    return intervalMap[resolution] || '1m'
  }

  unsubscribeBars(_subscribeUID: string): void {}
}
