import { useAtomValue } from 'jotai'
import { useMemo } from 'react'
import { orderAtom } from '@/store/order'
import { OrderSide, OrderStatus } from '@/types/order'
import { cn } from '@/utils/classMerge'

export const PositionsTab = () => {
  const orders = useAtomValue(orderAtom)

  // Get all filled orders
  const filledOrders = useMemo(() => {
    return orders.filter(order => order.status === OrderStatus.FILLED)
  }, [orders])

  if (filledOrders.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>No filled orders</p>
        <p className="text-sm mt-1">Your filled orders will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {filledOrders.map(order => (
        <div
          key={order.id}
          className="border border-gray-200 dark:border-gray-600 rounded-lg p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-gray-900 dark:text-white">
                {order.symbol}
              </span>
              <span
                className={cn(
                  'px-2 py-1 rounded text-xs font-medium',
                  order.side === OrderSide.BUY
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                )}
              >
                {order.side}
              </span>
              <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                FILLED
              </span>
            </div>
            <div className="text-right text-sm text-gray-500 dark:text-gray-400">
              {new Date(order.timestamp).toLocaleString()}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-500 dark:text-gray-400">Quantity</div>
              <div className="font-mono">{order.quantity.toFixed(4)}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Price</div>
              <div className="font-mono">{order.price.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Total</div>
              <div className="font-mono">
                {(order.quantity * order.price).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
