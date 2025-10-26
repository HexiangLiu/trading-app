import { useAtomValue } from 'jotai'
import { useCallback, useEffect, useState } from 'react'
import { orderAtom } from '@/store/order'
import type { Order } from '@/types/order'
import { OrderStatus } from '@/types/order'
import { cn } from '@/utils/classMerge'

interface Position {
  symbol: string
  side: 'BUY' | 'SELL'
  quantity: number
  averagePrice: number
  markPrice: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
}

export const PositionsTab = () => {
  const orders = useAtomValue(orderAtom)
  const [positions, setPositions] = useState<Position[]>([])

  // Mock mark price - in real implementation, this would come from real-time data
  const getMarkPrice = useCallback((symbol: string): number => {
    // This is a mock implementation
    const basePrices: Record<string, number> = {
      BTCUSDT: 45000,
      ETHUSDT: 3000,
      SOLUSDT: 100
    }
    return basePrices[symbol] || 0
  }, [])

  // Calculate positions from orders
  const calculatePositions = useCallback(
    (orders: Order[]): Position[] => {
      const positionMap = new Map<string, Position>()

      orders.forEach(order => {
        if (order.status === OrderStatus.FILLED) {
          const key = order.symbol
          const existing = positionMap.get(key)

          if (existing) {
            // Update existing position
            const totalValue =
              existing.quantity * existing.averagePrice +
              order.quantity * order.price
            const totalQuantity = existing.quantity + order.quantity

            positionMap.set(key, {
              ...existing,
              quantity: totalQuantity,
              averagePrice: totalValue / totalQuantity,
              markPrice: getMarkPrice(order.symbol), // This would come from real-time data
              unrealizedPnL:
                (getMarkPrice(order.symbol) - totalValue / totalQuantity) *
                totalQuantity,
              unrealizedPnLPercent:
                ((getMarkPrice(order.symbol) - totalValue / totalQuantity) /
                  (totalValue / totalQuantity)) *
                100
            })
          } else {
            // Create new position
            positionMap.set(key, {
              symbol: order.symbol,
              side: order.side,
              quantity: order.quantity,
              averagePrice: order.price,
              markPrice: getMarkPrice(order.symbol),
              unrealizedPnL:
                (getMarkPrice(order.symbol) - order.price) * order.quantity,
              unrealizedPnLPercent:
                ((getMarkPrice(order.symbol) - order.price) / order.price) * 100
            })
          }
        }
      })

      return Array.from(positionMap.values())
    },
    [getMarkPrice]
  )

  // Calculate positions when orders change
  useEffect(() => {
    const calculatedPositions = calculatePositions(orders)
    setPositions(calculatedPositions)
  }, [orders, calculatePositions])
  const formatPnL = (pnl: number) => {
    const isPositive = pnl >= 0
    return (
      <span
        className={cn(
          'font-mono text-sm',
          isPositive
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400'
        )}
      >
        {isPositive ? '+' : ''}
        {pnl.toFixed(2)}
      </span>
    )
  }

  const formatPnLPercent = (percent: number) => {
    const isPositive = percent >= 0
    return (
      <span
        className={cn(
          'font-mono text-xs',
          isPositive
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400'
        )}
      >
        {isPositive ? '+' : ''}
        {percent.toFixed(2)}%
      </span>
    )
  }

  if (positions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>No positions</p>
        <p className="text-sm mt-1">Your filled orders will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {positions.map((position, index) => (
        <div
          key={index}
          className="border border-gray-200 dark:border-gray-600 rounded-lg p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-gray-900 dark:text-white">
                {position.symbol}
              </span>
              <span
                className={cn(
                  'px-2 py-1 rounded text-xs font-medium',
                  position.side === 'BUY'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                )}
              >
                {position.side}
              </span>
            </div>
            <div className="text-right">
              {formatPnL(position.unrealizedPnL)}
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {formatPnLPercent(position.unrealizedPnLPercent)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-500 dark:text-gray-400">Quantity</div>
              <div className="font-mono">{position.quantity.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Avg Price</div>
              <div className="font-mono">
                {position.averagePrice.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Mark Price</div>
              <div className="font-mono">{position.markPrice.toFixed(2)}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
