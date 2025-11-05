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
      workerManager.sendMessage({
        type: 'ORDERS_UPDATE',
        data: { orders }
      })
    }
  }, [orders])

  // Remove orders for a closed position
  const removeClosedPosition = useCallback(
    (exchange: string, symbol: string) => {
      try {
        // Filter out all orders for this exchange-symbol pair
        setOrders(currentOrders => {
          return currentOrders.filter(
            order => !(order.exchange === exchange && order.symbol === symbol)
          )
        })
      } catch (error) {
        console.error(
          `Failed to remove orders for ${exchange}:${symbol}:`,
          error
        )
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
        totalUnrealizedPnL: data.totalUnrealizedPnL
      })
    }

    // Listen for position closed events
    const handlePositionClosed = (data: any) => {
      // Remove all orders for this exchange-symbol pair
      removeClosedPosition(data.exchange, data.symbol)
    }

    // Register message handlers
    workerManager.onMessage('PNL_UPDATE', handlePnLUpdate)
    workerManager.onMessage('POSITION_CLOSED', handlePositionClosed)

    return () => {
      workerManager.offMessage('PNL_UPDATE')
      workerManager.offMessage('POSITION_CLOSED')
    }
  }, [setPnLData, removeClosedPosition])

  return { pnlData }
}
