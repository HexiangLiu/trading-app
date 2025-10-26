/**
 * Order Book related types
 */

export interface OrderBookEntry {
  price: string
  quantity: string
}

export interface OrderBookData {
  lastUpdateId: number
  bids: OrderBookEntry[]
  asks: OrderBookEntry[]
  symbol: string
  timestamp: number
}

export interface ProcessedOrderBookEntry {
  price: number
  quantity: number
  total: number
}

export interface ProcessedOrderBook {
  bids: ProcessedOrderBookEntry[]
  asks: ProcessedOrderBookEntry[]
  symbol: string
  timestamp: number
}
