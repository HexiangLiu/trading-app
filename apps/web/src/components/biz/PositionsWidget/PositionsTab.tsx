import { useAtom } from 'jotai'
import { memo } from 'react'
import { pnlAtom } from '@/store/pnl'
import { cn } from '@/utils/classMerge'

export const PositionsTab = memo(() => {
  const [pnlData] = useAtom(pnlAtom)

  if (pnlData.positions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>No open positions</p>
        <p className="text-sm mt-1">Your positions will appear here</p>
      </div>
    )
  }

  return (
    <div className="space-y-4" data-testid="positions-tab-content">
      {/* PnL Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          Total Unrealized PnL
        </div>
        <div
          className={cn(
            'text-base sm:text-lg font-semibold',
            pnlData.totalUnrealizedPnL >= 0
              ? 'text-green-600 dark:text-green-400'
              : 'text-red-600 dark:text-red-400'
          )}
        >
          {pnlData.totalUnrealizedPnL >= 0 ? '+' : ''}
          {pnlData.totalUnrealizedPnL.toFixed(2)} USDT
        </div>
      </div>

      {/* Positions List */}
      <div className="space-y-3" data-testid="positions-list">
        {pnlData.positions.map((position, index) => (
          <div
            key={`${position.symbol}-${position.exchange}-${index}`}
            data-testid="position-item"
            className="border border-gray-200 dark:border-gray-600 rounded-lg p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {position.symbol}
                </span>
                <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                  {position.exchange}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Quantity
                </div>
                <div className="font-mono">{position.quantity.toFixed(4)}</div>
              </div>
              <div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Avg Price
                </div>
                <div className="font-mono">
                  {position.averagePrice.toFixed(2)} USDT
                </div>
              </div>
              <div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  Unrealized PnL
                </div>
                <div
                  className={cn(
                    'font-mono',
                    position.unrealizedPnL >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  )}
                >
                  {position.unrealizedPnL >= 0 ? '+' : ''}
                  {position.unrealizedPnL.toFixed(2)} USDT
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})
