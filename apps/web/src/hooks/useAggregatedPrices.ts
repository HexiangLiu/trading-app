/**
 * Hook for managing aggregated trade prices from Worker
 */

import { useCallback, useEffect, useState } from 'react'
import type { AggregatedPrice } from '@/workers/tradeAggregator'
import { getTradeWorkerManager } from '@/workers/tradeWorkerManager'

export function useAggregatedPrices() {
  const [prices, setPrices] = useState<Record<string, AggregatedPrice>>({})
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const workerManager = getTradeWorkerManager()

    if (!workerManager.initialized) {
      console.warn('Trade Worker not initialized')
      return
    }

    setIsConnected(true)

    // 监听聚合价格数据
    const handleAggregatedPrices = (data: AggregatedPrice[]) => {
      const priceMap: Record<string, AggregatedPrice> = {}
      data.forEach(price => {
        priceMap[price.symbol] = price
      })
      setPrices(prev => ({ ...prev, ...priceMap }))
    }

    // 注册消息处理器
    workerManager.onMessage('AGGREGATED_PRICES', handleAggregatedPrices)

    return () => {
      workerManager.offMessage('AGGREGATED_PRICES')
    }
  }, [])

  // 订阅交易对
  const subscribe = useCallback((symbol: string) => {
    const workerManager = getTradeWorkerManager()
    if (workerManager.initialized) {
      workerManager.subscribe(symbol)
    }
  }, [])

  // 取消订阅交易对
  const unsubscribe = useCallback((symbol: string) => {
    const workerManager = getTradeWorkerManager()
    if (workerManager.initialized) {
      workerManager.unsubscribe(symbol)
    }
  }, [])

  // 获取特定交易对的价格
  const getPrice = useCallback(
    (symbol: string): AggregatedPrice | undefined => {
      return prices[symbol]
    },
    [prices]
  )

  return {
    prices,
    isConnected,
    subscribe,
    unsubscribe,
    getPrice
  }
}
