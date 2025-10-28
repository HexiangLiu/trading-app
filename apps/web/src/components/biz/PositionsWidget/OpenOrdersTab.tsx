import { useAtomValue } from 'jotai'
import { memo, useMemo } from 'react'
import { orderAtom } from '@/store/order'
import { OrderStatus } from '@/types/order'
import { cn } from '@/utils/classMerge'

export const OpenOrdersTab = memo(() => {
  const orders = useAtomValue(orderAtom)

  const openOrders = useMemo(() => {
    return orders.filter(order => order.status === OrderStatus.PENDING)
  }, [orders])

  if (openOrders.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>No open orders</p>
        <p className="text-sm mt-1">Your pending orders will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-2" data-testid="open-orders-list">
      {openOrders.map(order => (
        <div
          key={order.id}
          data-testid="order-item"
          className="border border-gray-200 dark:border-gray-600 rounded-lg p-3"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-gray-900 dark:text-white">
                {order.symbol}
              </span>
              <span
                data-testid="order-side"
                className={cn(
                  'px-2 py-1 rounded text-xs font-medium',
                  order.side === 'BUY'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                )}
              >
                {order.side}
              </span>
              <span
                data-testid="order-type"
                className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              >
                {order.type}
              </span>
            </div>
            <span
              data-testid="order-status"
              className={cn(
                'px-2 py-1 rounded text-xs font-medium',
                order.status === OrderStatus.PENDING
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              )}
            >
              {order.status}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-xs sm:text-sm">
            <div>
              <div className="text-gray-500 dark:text-gray-400">Quantity</div>
              <div data-testid="order-quantity" className="font-mono">
                {order.quantity.toFixed(4)}
              </div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Price</div>
              <div data-testid="order-price" className="font-mono">
                {order.price.toFixed(2)} USDT
              </div>
            </div>
            <div>
              <div className="text-gray-500 dark:text-gray-400">Total</div>
              <div className="font-mono">
                {(order.price * order.quantity).toFixed(2)} USDT
              </div>
            </div>
          </div>
          {order.postOnly && (
            <div className="mt-2">
              <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                Post Only
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
})
