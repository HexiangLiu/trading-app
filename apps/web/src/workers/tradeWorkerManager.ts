import type { Order, TradeData, WorkerMessage } from './tradeAggregator'

export class TradeWorkerManager {
  private worker: Worker | null = null
  private messageHandlers = new Map<string, (data: any) => void>()
  private isInitialized = false

  constructor() {
    this.initWorker()
  }

  private initWorker() {
    if (this.worker) return

    try {
      this.worker = new Worker(
        new URL('./tradeAggregator.ts', import.meta.url),
        { type: 'module' }
      )

      this.worker.onmessage = (event: MessageEvent) => {
        const { type, data } = event.data
        const handler = this.messageHandlers.get(type)
        if (handler) {
          handler(data)
        }
      }

      this.worker.onerror = error => {
        console.error('Trade Worker error:', error)
      }

      this.isInitialized = true
      console.log('Trade Worker initialized')
    } catch (error) {
      console.error('Failed to initialize Trade Worker:', error)
    }
  }

  subscribe(symbol: string) {
    if (!this.worker || !this.isInitialized) {
      console.warn('Worker not initialized, cannot subscribe to:', symbol)
      return
    }

    this.sendMessage({
      type: 'SUBSCRIBE',
      data: { symbol }
    })
  }

  unsubscribe(symbol: string) {
    if (!this.worker || !this.isInitialized) {
      console.warn('Worker not initialized, cannot unsubscribe from:', symbol)
      return
    }

    this.sendMessage({
      type: 'UNSUBSCRIBE',
      data: { symbol }
    })
  }

  sendTradeData(tradeData: TradeData) {
    if (!this.worker || !this.isInitialized) {
      return
    }

    this.sendMessage({
      type: 'TRADE_DATA',
      data: tradeData
    })
  }

  updateOrders(orders: Order[]) {
    if (!this.worker || !this.isInitialized) {
      return
    }

    this.sendMessage({
      type: 'ORDERS_UPDATE',
      data: { orders }
    })
  }

  onMessage(type: string, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler)
  }

  offMessage(type: string) {
    this.messageHandlers.delete(type)
  }

  private sendMessage(message: WorkerMessage) {
    if (this.worker) {
      this.worker.postMessage(message)
    }
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
      this.isInitialized = false
      this.messageHandlers.clear()
    }
  }

  get initialized() {
    return this.isInitialized
  }
}

let tradeWorkerManager: TradeWorkerManager | null = null

export function getTradeWorkerManager(): TradeWorkerManager {
  if (!tradeWorkerManager) {
    tradeWorkerManager = new TradeWorkerManager()
  }
  return tradeWorkerManager
}

export function destroyTradeWorkerManager() {
  if (tradeWorkerManager) {
    tradeWorkerManager.destroy()
    tradeWorkerManager = null
  }
}
