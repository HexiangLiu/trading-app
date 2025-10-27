/**
 * Trade Aggregator Web Worker - Simplified Version
 * Only aggregates price data and pushes periodically
 */

interface TradeData {
  symbol: string
  price: number
  quantity: number
  timestamp: number
}

interface AggregatedPrice {
  symbol: string
  price: number
  lastUpdate: number
}

interface Order {
  id: string
  symbol: string
  exchange: string
  side: 'BUY' | 'SELL'
  type: 'LIMIT'
  price: number
  quantity: number
  postOnly: boolean
  status: 'PENDING' | 'REJECTED' | 'FILLED' | 'CANCELLED'
  timestamp: number
  filledQuantity?: number
  averagePrice?: number
}

interface Position {
  symbol: string
  exchange: string
  quantity: number
  averagePrice: number
  unrealizedPnL: number
  realizedPnL: number
  lastUpdate: number
}

interface PnLData {
  positions: Position[]
  totalUnrealizedPnL: number
  totalRealizedPnL: number
}

interface WorkerMessage {
  type: 'TRADE_DATA' | 'SUBSCRIBE' | 'UNSUBSCRIBE' | 'ORDERS_UPDATE'
  data?: any
}

// Store latest price for each trading pair
const symbolPrices = new Map<
  string,
  {
    price: number
    lastUpdate: number
    subscribed: boolean
  }
>()

// Store current orders (for future use if needed)
// let currentOrders: Order[] = []

// Store positions for PnL calculation
const positions = new Map<string, Position>()

// Push interval (milliseconds)
const PUSH_INTERVAL = 1000

let pushTimer: number | null = null

// Start periodic price pushing
function startPushTimer() {
  if (pushTimer) return

  // Push initial PnL data immediately
  const initialPnLData = calculatePnL()
  self.postMessage({
    type: 'PNL_UPDATE',
    data: initialPnLData
  })

  pushTimer = setInterval(() => {
    const prices: AggregatedPrice[] = []

    symbolPrices.forEach((data, symbol) => {
      if (data.subscribed && data.price > 0) {
        prices.push({
          symbol,
          price: data.price,
          lastUpdate: data.lastUpdate
        })
      }
    })

    if (prices.length > 0) {
      self.postMessage({
        type: 'AGGREGATED_PRICES',
        data: prices
      })
    }

    // Also push PnL data if we have positions
    if (positions.size > 0) {
      const pnlData = calculatePnL()
      self.postMessage({
        type: 'PNL_UPDATE',
        data: pnlData
      })
    }
  }, PUSH_INTERVAL)
}

// Stop periodic price pushing
function stopPushTimer() {
  if (pushTimer) {
    clearInterval(pushTimer)
    pushTimer = null
  }
}

// Handle trade data
function handleTradeData(tradeData: TradeData) {
  const { symbol, price, timestamp } = tradeData
  const normalizedSymbol = symbol.toLowerCase()

  if (!symbolPrices.has(normalizedSymbol)) {
    symbolPrices.set(normalizedSymbol, {
      price: 0,
      lastUpdate: 0,
      subscribed: false
    })
  }

  const data = symbolPrices.get(normalizedSymbol)
  if (data) {
    data.price = price
    data.lastUpdate = timestamp
  }
}

// Subscribe to trading pair
function subscribeSymbol(symbol: string) {
  if (!symbolPrices.has(symbol)) {
    symbolPrices.set(symbol, {
      price: 0,
      lastUpdate: 0,
      subscribed: true
    })
  } else {
    const data = symbolPrices.get(symbol)
    if (data) {
      data.subscribed = true
    }
  }

  startPushTimer()
}

// Unsubscribe from trading pair
function unsubscribeSymbol(symbol: string) {
  const data = symbolPrices.get(symbol)
  if (data) {
    data.subscribed = false
  }

  // Stop timer if no active subscriptions
  const hasActiveSubscriptions = Array.from(symbolPrices.values()).some(
    data => data.subscribed
  )
  if (!hasActiveSubscriptions) {
    stopPushTimer()
  }
}

// Calculate PnL for all positions
function calculatePnL(): PnLData {
  const positionList: Position[] = []
  let totalUnrealizedPnL = 0
  let totalRealizedPnL = 0

  positions.forEach(position => {
    const currentPrice =
      symbolPrices.get(position.symbol.toLowerCase())?.price || 0

    if (currentPrice > 0) {
      // Calculate unrealized PnL
      const unrealizedPnL =
        (currentPrice - position.averagePrice) * position.quantity
      position.unrealizedPnL = unrealizedPnL
      position.lastUpdate = Date.now()

      totalUnrealizedPnL += unrealizedPnL
    }

    totalRealizedPnL += position.realizedPnL
    positionList.push({ ...position })
  })

  return {
    positions: positionList,
    totalUnrealizedPnL,
    totalRealizedPnL
  }
}

// Update positions based on filled orders
function updatePositions(orders: Order[]) {
  // Group filled orders by symbol
  const filledOrdersBySymbol = new Map<string, Order[]>()

  orders
    .filter(order => order.status === 'FILLED')
    .forEach(order => {
      const key = `${order.exchange}:${order.symbol}`
      if (!filledOrdersBySymbol.has(key)) {
        filledOrdersBySymbol.set(key, [])
      }
      const orders = filledOrdersBySymbol.get(key)
      if (orders) {
        orders.push(order)
      }
    })

  // Calculate positions for each symbol
  filledOrdersBySymbol.forEach((orders, key) => {
    const [exchange, symbol] = key.split(':')
    let totalQuantity = 0
    let totalValue = 0
    let realizedPnL = 0

    // Process orders chronologically
    const sortedOrders = orders.sort((a, b) => a.timestamp - b.timestamp)

    for (const order of sortedOrders) {
      const quantity = order.quantity
      const price = order.price

      if (order.side === 'BUY') {
        // Add to position
        totalQuantity += quantity
        totalValue += quantity * price
      } else if (order.side === 'SELL') {
        if (totalQuantity > 0) {
          // Calculate realized PnL for the sold portion
          const sellQuantity = Math.min(quantity, totalQuantity)
          const avgCost = totalValue / totalQuantity
          const realizedGain = (price - avgCost) * sellQuantity
          realizedPnL += realizedGain

          // Reduce position
          totalQuantity -= sellQuantity
          totalValue -= sellQuantity * avgCost
        }
      }
    }

    // Update or create position
    if (totalQuantity > 0) {
      const averagePrice = totalValue / totalQuantity
      positions.set(key, {
        symbol,
        exchange,
        quantity: totalQuantity,
        averagePrice,
        unrealizedPnL: 0, // Will be calculated in calculatePnL
        realizedPnL,
        lastUpdate: Date.now()
      })
    } else {
      // Remove position if fully closed
      positions.delete(key)
    }
  })

  // Remove positions for symbols that no longer have filled orders
  const activeSymbols = new Set(filledOrdersBySymbol.keys())
  for (const [key] of positions) {
    if (!activeSymbols.has(key)) {
      positions.delete(key)
    }
  }
}

// Handle orders update
function handleOrdersUpdate(orders: Order[]) {
  updatePositions(orders)

  // Push updated PnL data
  const pnlData = calculatePnL()
  self.postMessage({
    type: 'PNL_UPDATE',
    data: pnlData
  })
}

// Listen to main thread messages
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, data } = event.data

  switch (type) {
    case 'TRADE_DATA': {
      handleTradeData(data)
      break
    }

    case 'SUBSCRIBE': {
      subscribeSymbol(data.symbol)
      break
    }

    case 'UNSUBSCRIBE': {
      unsubscribeSymbol(data.symbol)
      break
    }

    case 'ORDERS_UPDATE': {
      handleOrdersUpdate(data.orders)
      break
    }

    default:
      console.warn('Unknown message type:', type)
  }
}

export type {
  TradeData,
  AggregatedPrice,
  WorkerMessage,
  Order,
  Position,
  PnLData
}
