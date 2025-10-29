import { useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useEffect } from 'react'
import { orderAtom } from '@/store/order'
import { pnlAtom } from '@/store/pnl'
import type { Order } from '@/types/order'
import { getTradeWorkerManager } from '@/workers/tradeWorkerManager'

export function usePnL(orders: Order[]) {
  const pnlData = useAtomValue(pnlAtom)
  const setPnLData = useSetAtom(pnlAtom)
  const setOrders = useSetAtom(orderAtom)

  // Update orders in Worker for PnL calculation
  useEffect(() => {
    const workerManager = getTradeWorkerManager()
    if (workerManager.initialized) {
      workerManager.updateOrders(orders)
    }
  }, [orders])

  // Remove closed orders from orderAtom
  const removeClosedOrders = useCallback(
    (closedOrders: Order[]) => {
      try {
        // Filter out closed orders from current orders
        setOrders(currentOrders => {
          const activeOrders = currentOrders.filter(
            order => !closedOrders.some(closed => closed.id === order.id)
          )

          return activeOrders
        })
      } catch (error) {
        console.error('Failed to remove closed orders from orderAtom:', error)
      }
    },
    [setOrders]
  )

  // Listen for PnL updates and position closed events from Worker
  useEffect(() => {
    const workerManager = getTradeWorkerManager()

    if (!workerManager.initialized) {
      console.warn('Trade Worker not initialized')
      return
    }

    // Listen for PnL updates
    const handlePnLUpdate = (data: any) => {
      setPnLData({
        positions: [...data.positions],
        totalUnrealizedPnL: data.totalUnrealizedPnL,
        totalRealizedPnL: data.totalRealizedPnL
      })
    }

    // Listen for position closed events
    const handlePositionClosed = (data: any) => {
      // Remove closed orders from orderAtom
      removeClosedOrders(data.closedOrders)
    }

    // Register message handlers
    workerManager.onMessage('PNL_UPDATE', handlePnLUpdate)
    workerManager.onMessage('POSITION_CLOSED', handlePositionClosed)

    return () => {
      workerManager.offMessage('PNL_UPDATE')
      workerManager.offMessage('POSITION_CLOSED')
    }
  }, [setPnLData, removeClosedOrders])

  return { pnlData }
}
