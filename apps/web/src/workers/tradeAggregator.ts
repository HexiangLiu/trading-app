/**
 * Trade Aggregator Web Worker - Simplified Version
 * Only aggregates price data and pushes periodically
 */

// ==================== Type Definitions ====================

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
  lastUpdate: number
}

interface PnLData {
  positions: Position[]
  totalUnrealizedPnL: number
}

interface SymbolPriceData {
  price: number
  lastUpdate: number
}

interface WorkerMessage {
  type:
    | 'TRADE_DATA'
    | 'SUBSCRIBE'
    | 'UNSUBSCRIBE'
    | 'ORDERS_UPDATE'
    | 'PNL_UPDATE'
    | 'POSITION_CLOSED'
    | 'AGGREGATED_PRICES'
  data?: any
}

interface PositionState {
  positionQty: number
  positionCost: number
  activeOrders: Order[]
}

// ==================== Constants ====================

const PUSH_INTERVAL = 1000 // milliseconds
const LOG_PREFIX = '[TradeAggregator]'

// ==================== State Management ====================

// Store latest price for each trading pair
const symbolPrices = new Map<string, SymbolPriceData>()

// Store positions for PnL calculation
const positions = new Map<string, Position>()

let pushTimer: number | null = null

// ==================== Utility Functions ====================

/**
 * Unified logging
 */
function log(
  level: 'info' | 'warn' | 'error',
  message: string,
  ...args: any[]
) {
  console[level](`${LOG_PREFIX} ${message}`, ...args)
}

/**
 * Create or get symbol price data
 */
function getOrCreateSymbolPrice(symbol: string): SymbolPriceData {
  let data = symbolPrices.get(symbol)
  if (!data) {
    data = {
      price: 0,
      lastUpdate: 0
    }
    symbolPrices.set(symbol, data)
  }
  return data
}

/**
 * Get current price for a symbol
 */
function getCurrentPrice(symbol: string): number {
  return symbolPrices.get(symbol.toLowerCase())?.price || 0
}

/**
 * Create position key
 */
function createPositionKey(exchange: string, symbol: string): string {
  return `${exchange}:${symbol}`
}

/**
 * Post message to main thread
 */
function postWorkerMessage(type: WorkerMessage['type'], data: any) {
  self.postMessage({ type, data })
}

// ==================== Price Aggregation ====================

/**
 * Start periodic price pushing
 */
function startPushTimer() {
  if (pushTimer) return

  // Push initial PnL data immediately
  const initialPnLData = calculatePnL()
  postWorkerMessage('PNL_UPDATE', initialPnLData)

  pushTimer = setInterval(() => {
    // Push aggregated prices
    const prices = collectAggregatedPrices()
    if (prices.length > 0) {
      postWorkerMessage('AGGREGATED_PRICES', prices)
    }

    // Push PnL data if we have positions
    if (positions.size > 0) {
      const pnlData = calculatePnL()
      postWorkerMessage('PNL_UPDATE', pnlData)
    }
  }, PUSH_INTERVAL)
}

/**
 * Stop periodic price pushing
 */
function stopPushTimer() {
  if (pushTimer) {
    clearInterval(pushTimer)
    pushTimer = null
  }
}

/**
 * Collect aggregated prices for all symbols with valid prices
 */
function collectAggregatedPrices(): AggregatedPrice[] {
  const prices: AggregatedPrice[] = []

  symbolPrices.forEach((data, symbol) => {
    if (data.price > 0) {
      prices.push({
        symbol,
        price: data.price,
        lastUpdate: data.lastUpdate
      })
    }
  })

  return prices
}

// ==================== Trade Data Handling ====================

/**
 * Handle incoming trade data
 * Only updates prices for symbols that are subscribed (exist in the map)
 */
function handleTradeData(tradeData: TradeData) {
  const { symbol, price, timestamp } = tradeData
  const normalizedSymbol = symbol.toLowerCase()

  // Only update if symbol is subscribed
  const data = symbolPrices.get(normalizedSymbol)
  if (data) {
    data.price = price
    data.lastUpdate = timestamp
  }
}

// ==================== Subscription Management ====================

/**
 * Subscribe to trading pair
 * Creates a placeholder for the symbol and starts the push timer
 */
function subscribeSymbol(symbol: string) {
  // Ensure symbol exists in the map (will be created if not exists)
  getOrCreateSymbolPrice(symbol)

  // Start push timer if we have symbols
  if (symbolPrices.size > 0) {
    startPushTimer()
  }
}

/**
 * Unsubscribe from trading pair
 * Removes the symbol from the map and stops timer if no more symbols
 */
function unsubscribeSymbol(symbol: string) {
  symbolPrices.delete(symbol)

  // Stop timer if no more symbols
  if (symbolPrices.size === 0) {
    stopPushTimer()
  }
}

// ==================== PnL Calculation ====================

/**
 * Calculate PnL for all positions
 * Only calculates unrealized PnL for open positions
 */
function calculatePnL(): PnLData {
  const positionList: Position[] = []
  let totalUnrealizedPnL = 0

  // Calculate unrealized PnL for open positions
  positions.forEach(position => {
    const currentPrice = getCurrentPrice(position.symbol)

    if (currentPrice > 0) {
      // Calculate unrealized PnL
      const unrealizedPnL =
        (currentPrice - position.averagePrice) * position.quantity
      position.unrealizedPnL = unrealizedPnL
      position.lastUpdate = Date.now()

      totalUnrealizedPnL += unrealizedPnL
    }

    positionList.push({ ...position })
  })

  return {
    positions: positionList,
    totalUnrealizedPnL
  }
}

// ==================== Position Management ====================

/**
 * Group filled orders by symbol
 */
function groupOrdersBySymbol(orders: Order[]): Map<string, Order[]> {
  const filledOrdersBySymbol = new Map<string, Order[]>()
  const filledOrders = orders.filter(order => order.status === 'FILLED')

  filledOrders.forEach(order => {
    const key = createPositionKey(order.exchange, order.symbol)
    const existingOrders = filledOrdersBySymbol.get(key)
    if (existingOrders) {
      existingOrders.push(order)
    } else {
      filledOrdersBySymbol.set(key, [order])
    }
  })

  return filledOrdersBySymbol
}

/**
 * Process buy order
 */
function processBuyOrder(state: PositionState, order: Order): void {
  state.positionQty += order.quantity
  state.positionCost += order.quantity * order.price
  state.activeOrders.push(order)
}

/**
 * Process sell order
 */
function processSellOrder(
  state: PositionState,
  order: Order,
  positionKey: string
): void {
  const { quantity } = order

  if (state.positionQty > 0) {
    // Sell with existing position: partial or full close
    const offsetQty = Math.min(quantity, state.positionQty)
    const avgCost = state.positionCost / state.positionQty

    // Reduce position
    state.positionQty -= offsetQty
    state.positionCost -= avgCost * offsetQty

    // If fully closed, clear active orders
    if (state.positionQty === 0) {
      state.activeOrders = []
    }

    // Handle oversold case
    const remainSell = quantity - offsetQty
    if (remainSell > 0) {
      log(
        'warn',
        `Oversold detected for ${positionKey}, remainSell: ${remainSell}`
      )
    }
  } else {
    // Sell without position
    log('warn', `Sell order without position for ${positionKey}`)
  }
}

/**
 * Calculate position for a symbol
 */
function calculatePositionForSymbol(
  orders: Order[],
  positionKey: string
): PositionState {
  const state: PositionState = {
    positionQty: 0,
    positionCost: 0,
    activeOrders: []
  }

  // Process orders chronologically
  const sortedOrders = orders.sort((a, b) => a.timestamp - b.timestamp)

  for (const order of sortedOrders) {
    if (order.side === 'BUY') {
      processBuyOrder(state, order)
    } else if (order.side === 'SELL') {
      processSellOrder(state, order, positionKey)
    }
  }

  return state
}

/**
 * Remove position
 */
function removePosition(positionKey: string): void {
  positions.delete(positionKey)
}

/**
 * Update or remove position
 */
function updatePosition(
  positionKey: string,
  exchange: string,
  symbol: string,
  state: PositionState
): void {
  if (state.positionQty !== 0) {
    // Update or create position
    const averagePrice = state.positionCost / Math.abs(state.positionQty)
    positions.set(positionKey, {
      symbol,
      exchange,
      quantity: state.positionQty,
      averagePrice,
      unrealizedPnL: 0, // Will be calculated in calculatePnL
      lastUpdate: Date.now()
    })
  } else {
    // Position closed, remove and send notification
    removePosition(positionKey)
    postWorkerMessage('POSITION_CLOSED', {
      exchange,
      symbol
    })
  }
}

/**
 * Update positions based on filled orders
 *
 * Positions are recalculated from all orders each time.
 * This ensures positions always reflect the current state of orders.
 */
function updatePositions(orders: Order[]) {
  const filledOrdersBySymbol = groupOrdersBySymbol(orders)

  // Calculate positions for each symbol with FILLED orders
  filledOrdersBySymbol.forEach((orders, key) => {
    const [exchange, symbol] = key.split(':')
    const state = calculatePositionForSymbol(orders, key)
    updatePosition(key, exchange, symbol, state)
  })
}

/**
 * Handle orders update
 */
function handleOrdersUpdate(orders: Order[]) {
  updatePositions(orders)

  // Push updated PnL data
  const pnlData = calculatePnL()
  postWorkerMessage('PNL_UPDATE', pnlData)
}

// ==================== Message Handler ====================

/**
 * Listen to main thread messages
 */
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
      log('warn', 'Unknown message type:', type)
  }
}

// ==================== Exports ====================

export type {
  TradeData,
  AggregatedPrice,
  WorkerMessage,
  Order,
  Position,
  PnLData
}
