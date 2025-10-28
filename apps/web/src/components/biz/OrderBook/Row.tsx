import { memo } from 'react'
import type { ProcessedOrderBookEntry } from '@/types/orderbook'

export const OrderBookRow = memo<{
  entry: ProcessedOrderBookEntry
  type: 'bid' | 'ask'
  maxTotal: number
}>(({ entry, type, maxTotal }) => {
  const barWidth = (entry.total / maxTotal) * 100

  return (
    <div className="relative flex items-center justify-between py-1 px-2 text-sm hover:bg-gray-800/50 transition-colors">
      {/* Background bar for total visualization - from right to left */}
      <div
        className={`absolute inset-0 transition-all duration-150 ${
          type === 'bid' ? 'bg-green-500/10' : 'bg-red-500/10'
        }`}
        style={{
          width: `${barWidth}%`,
          right: 0,
          left: 'auto'
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex w-full items-center justify-between">
        <span
          className={`text-xs sm:text-sm font-mono ${type === 'bid' ? 'text-green-400' : 'text-red-400'}`}
        >
          {entry.price.toFixed(2)}
        </span>
        <span className="text-xs sm:text-sm flex-1 font-mono dark:text-white text-neutral-900 text-right">
          {entry.quantity.toFixed(4)}
        </span>
        <span className="flex-1 font-mono dark:text-white text-neutral-900 text-xxs sm:text-xs text-right">
          {entry.total.toFixed(4)}
        </span>
      </div>
    </div>
  )
})

OrderBookRow.displayName = 'OrderBookRow'
