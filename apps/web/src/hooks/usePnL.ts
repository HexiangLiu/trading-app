import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect } from 'react'
import { pnlAtom } from '@/store/pnl'
import type { Order } from '@/types/order'
import { getTradeWorkerManager } from '@/workers/tradeWorkerManager'

export function usePnL(orders: Order[]) {
  const pnlData = useAtomValue(pnlAtom)
  const setPnLData = useSetAtom(pnlAtom)

  // Update orders in Worker for PnL calculation
  useEffect(() => {
    const workerManager = getTradeWorkerManager()
    if (workerManager.initialized) {
      workerManager.updateOrders(orders)
    }
  }, [orders])

  // Listen for PnL updates from Worker
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

    // Register message handler
    workerManager.onMessage('PNL_UPDATE', handlePnLUpdate)

    return () => {
      workerManager.offMessage('PNL_UPDATE')
    }
  }, [setPnLData])

  return { pnlData }
}
