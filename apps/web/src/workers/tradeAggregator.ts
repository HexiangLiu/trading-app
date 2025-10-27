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

interface WorkerMessage {
  type: 'TRADE_DATA' | 'SUBSCRIBE' | 'UNSUBSCRIBE'
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

// Push interval (milliseconds)
const PUSH_INTERVAL = 1000

let pushTimer: number | null = null

// Start periodic price pushing
function startPushTimer() {
  if (pushTimer) return

  pushTimer = setInterval(() => {
    const prices: AggregatedPrice[] = []

    symbolPrices.forEach((data, symbol) => {
      console.log(
        `Symbol ${symbol}: subscribed=${data.subscribed}, price=${data.price}`
      )
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
  const normalizedSymbol = symbol
  console.log('Worker subscribing to symbol:', symbol, '->', normalizedSymbol)

  if (!symbolPrices.has(normalizedSymbol)) {
    symbolPrices.set(normalizedSymbol, {
      price: 0,
      lastUpdate: 0,
      subscribed: true
    })
  } else {
    const data = symbolPrices.get(normalizedSymbol)
    if (data) {
      data.subscribed = true
    }
  }

  startPushTimer()
}

// Unsubscribe from trading pair
function unsubscribeSymbol(symbol: string) {
  const normalizedSymbol = symbol
  const data = symbolPrices.get(normalizedSymbol)
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

    default:
      console.warn('Unknown message type:', type)
  }
}

export type { TradeData, AggregatedPrice, WorkerMessage }
