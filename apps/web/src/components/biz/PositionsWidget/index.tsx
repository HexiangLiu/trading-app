import { useAtom } from 'jotai'
import { memo, useEffect, useMemo, useState } from 'react'
import { exchangeAdapterManager } from '@/adapters'
import { useAggregatedPrices } from '@/hooks/useAggregatedPrices'
import { usePnL } from '@/hooks/usePnL'
import { orderAtom } from '@/store/order'
import { OrderSide, OrderStatus } from '@/types/order'
import { cn } from '@/utils/classMerge'
import { OpenOrdersTab } from './OpenOrdersTab'
import { PositionsTab } from './PositionsTab'

type TabType = 'positions' | 'orders'

export const PositionsWidget = memo(() => {
  const [activeTab, setActiveTab] = useState<TabType>('positions')
  const [orders, setOrders] = useAtom(orderAtom)
  const { prices, subscribe, unsubscribe } = useAggregatedPrices()

  // usePnL automatically updates orders in Worker
  usePnL(orders)

  // Get unique exchange-symbol combinations from all orders
  const orderInstruments = useMemo(() => {
    const instruments = new Map<string, { exchange: string; symbol: string }>()

    orders.forEach(order => {
      const key = `${order.exchange}:${order.symbol}`
      if (!instruments.has(key)) {
        instruments.set(key, {
          exchange: order.exchange,
          symbol: order.symbol
        })
      }
    })

    const result = Array.from(instruments.values())
    return result
  }, [orders])

  // Subscribe to trade streams for all order instruments
  useEffect(() => {
    console.log('orderInstruments', orderInstruments)
    console.log('Subscribing to instruments:', orderInstruments)

    orderInstruments.forEach(({ exchange, symbol }) => {
      console.log(`Subscribing to ${exchange}:${symbol}`)

      // Subscribe to trade stream for this exchange-symbol combination
      exchangeAdapterManager.subscribe(exchange as any, {
        symbol,
        streamType: 'trade',
        callback: () => {} // Empty callback, data goes to Worker
      })

      // Subscribe to aggregated prices
      subscribe(symbol)
    })

    return () => {
      console.log('Cleaning up subscriptions')
      // Cleanup subscriptions
      orderInstruments.forEach(({ exchange, symbol }) => {
        exchangeAdapterManager.unsubscribe(
          exchange as any,
          symbol,
          'trade',
          undefined
        )
        unsubscribe(symbol)
      })
    }
  }, [orderInstruments, subscribe, unsubscribe])

  // Process aggregated prices to fill orders
  useEffect(() => {
    if (Object.keys(prices).length === 0) return

    const updatedOrders = orders.map(order => {
      if (order.status !== OrderStatus.PENDING) return order

      const priceData = prices[order.symbol]
      if (!priceData) return order

      const tradePrice = priceData.price

      // Check if buy order should be filled (order price >= trade price)
      if (order.side === OrderSide.BUY && order.price >= tradePrice) {
        return {
          ...order,
          status: OrderStatus.FILLED
        }
      }

      // Check if sell order should be filled (order price <= trade price)
      if (order.side === OrderSide.SELL && order.price <= tradePrice) {
        return {
          ...order,
          status: OrderStatus.FILLED
        }
      }

      return order
    })

    // Only update if there are changes
    const hasChanges = updatedOrders.some(
      (order, index) => order.status !== orders[index].status
    )

    if (hasChanges) {
      setOrders(updatedOrders)
    }
  }, [prices, orders, setOrders])

  return (
    <div className="bg-gray-100 dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Positions & Orders
        </h3>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('positions')}
          className={cn(
            'flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors cursor-pointer',
            activeTab === 'positions'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'bg-white/50 dark:bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          )}
        >
          Positions
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={cn(
            'flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors cursor-pointer',
            activeTab === 'orders'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'bg-white/50 dark:bg-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          )}
        >
          Open Orders
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px]">
        {activeTab === 'positions' && <PositionsTab />}
        {activeTab === 'orders' && <OpenOrdersTab />}
      </div>
    </div>
  )
})
