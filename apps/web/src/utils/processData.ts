import type {
  OrderBookData,
  OrderBookEntry,
  ProcessedOrderBook,
  ProcessedOrderBookEntry,
} from '@/types/orderbook'

/**
 * Process raw order book data by aggregating orders by tick size and calculating cumulative totals
 */
export const processOrderBookData = (
  data: OrderBookData,
  tickSize: number
): ProcessedOrderBook => {
  const processEntries = (
    entries: OrderBookEntry[],
    isBids: boolean = true
  ): ProcessedOrderBookEntry[] => {
    const map = new Map<number, number>()

    for (const entry of entries) {
      const price = parseFloat(entry.price)
      const qty = parseFloat(entry.quantity)

      if (qty === 0) continue // Skip zero quantity orders

      // Round down to the nearest tick level
      const rounded = Math.floor(price / tickSize) * tickSize

      map.set(rounded, (map.get(rounded) || 0) + qty)
    }

    // Sort entries in descending order (both bids and asks)
    const sortedEntries = Array.from(map.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([price, qty]) => ({ price, quantity: qty }))

    // Calculate cumulative totals
    let total = 0

    if (isBids) {
      return sortedEntries.map(entry => {
        total += entry.quantity
        return {
          price: entry.price,
          quantity: entry.quantity,
          total,
        }
      })
    }

    return sortedEntries
      .slice()
      .reverse()
      .map(entry => {
        total += entry.quantity
        return {
          price: entry.price,
          quantity: entry.quantity,
          total,
        }
      })
      .reverse()
  }

  const bids = processEntries(data.bids, true)
  const asks = processEntries(data.asks, false)

  return {
    bids,
    asks,
    symbol: data.symbol,
    timestamp: data.timestamp,
  }
}
