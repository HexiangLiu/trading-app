import { useState } from 'react'
import { cn } from '@/utils/classMerge'
import { OpenOrdersTab } from './OpenOrdersTab'
import { PositionsTab } from './PositionsTab'

type TabType = 'positions' | 'orders'

export const PositionsWidget = () => {
  const [activeTab, setActiveTab] = useState<TabType>('positions')

  return (
    <div className="bg-gray-100 dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Positions & Orders
        </h3>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-4 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('positions')}
          className={cn(
            'flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors cursor-pointer',
            activeTab === 'positions'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          )}
        >
          Positions
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={cn(
            'flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors cursor-pointer',
            activeTab === 'orders'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
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
}
