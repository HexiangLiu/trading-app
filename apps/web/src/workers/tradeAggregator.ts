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
  type:
    | 'TRADE_DATA'
    | 'SUBSCRIBE'
    | 'UNSUBSCRIBE'
    | 'ORDERS_UPDATE'
    | 'PNL_UPDATE'
    | 'POSITION_CLOSED'
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

// Update positions based on filled orders with Active/Closed distinction
function updatePositions(orders: Order[]) {
  // Group filled orders by symbol
  const filledOrdersBySymbol = new Map<string, Order[]>()
  const filledOrders = orders.filter(order => order.status === 'FILLED')

  filledOrders.forEach(order => {
    const key = `${order.exchange}:${order.symbol}`
    if (!filledOrdersBySymbol.has(key)) {
      filledOrdersBySymbol.set(key, [])
    }
    const orders = filledOrdersBySymbol.get(key)
    if (orders) {
      orders.push(order)
    }
  })

  // Track which positions are still active after processing
  const activePositionKeys = new Set<string>()

  // Calculate positions for each symbol with Active/Closed logic
  filledOrdersBySymbol.forEach((orders, key) => {
    const [exchange, symbol] = key.split(':')
    let positionQty = 0 // Net quantity (positive = long, negative = short)
    let positionCost = 0 // Total cost basis
    let realizedPnL = 0 // Accumulated realized PnL
    let activeOrders: Order[] = [] // Orders that contribute to current position
    const closedOrders: Order[] = [] // Orders that have been fully offset

    // Process orders chronologically
    const sortedOrders = orders.sort((a, b) => a.timestamp - b.timestamp)

    for (const order of sortedOrders) {
      const quantity = order.quantity
      const price = order.price

      if (order.side === 'BUY') {
        // Buy order: increase position
        positionQty += quantity
        positionCost += quantity * price
        activeOrders.push(order)
      } else if (order.side === 'SELL') {
        if (positionQty > 0) {
          // Sell with existing position: partial or full close
          const offsetQty = Math.min(quantity, positionQty)
          const avgCost = positionCost / positionQty

          // Calculate realized PnL: sell price - cost price
          const realizedGain = (price - avgCost) * offsetQty
          realizedPnL += realizedGain

          // Reduce position
          positionQty -= offsetQty
          positionCost -= avgCost * offsetQty

          // If fully closed, mark related orders as closed
          if (positionQty === 0) {
            closedOrders.push(...activeOrders)
            activeOrders = []
          }

          // Note: oversold should not create short position
          // In normal trading, sell quantity cannot exceed position quantity
          const remainSell = quantity - offsetQty
          if (remainSell > 0) {
            console.warn(
              `Oversold detected for ${key}, remainSell: ${remainSell}, this should not happen in normal trading`
            )
            // Do not create short position, only log warning
          }
        } else if (positionQty <= 0) {
          // Sell without position: should be rejected in normal trading
          console.warn(
            `Sell order without position for ${key}, this should not happen in normal trading`
          )
          // Do not process this order, or can choose to reject
        }
      }
    }

    // Update or create position
    if (positionQty !== 0) {
      const averagePrice = positionCost / Math.abs(positionQty)
      positions.set(key, {
        symbol,
        exchange,
        quantity: positionQty,
        averagePrice,
        unrealizedPnL: 0, // Will be calculated in calculatePnL
        realizedPnL,
        lastUpdate: Date.now()
      })
      activePositionKeys.add(key)
    } else {
      // Position closed, remove position
      positions.delete(key)
    }

    // Send closed orders event if needed
    if (closedOrders.length > 0) {
      self.postMessage({
        type: 'POSITION_CLOSED',
        data: {
          symbol: key,
          closedOrders,
          realizedPnL
        }
      })
    }
  })

  // Remove positions that no longer have active orders
  for (const [key] of positions) {
    if (!activePositionKeys.has(key)) {
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
