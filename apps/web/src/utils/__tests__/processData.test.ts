import { describe, expect, it } from 'vitest'
import type { OrderBookData } from '@/types/orderbook'
import { processOrderBookData } from '../processData'

describe('processOrderBookData', () => {
  const tickSize = 1

  it('should aggregate orders by tick size', () => {
    const data: OrderBookData = {
      lastUpdateId: 1234567890,
      symbol: 'BTCUSDT',
      timestamp: Date.now(),
      bids: [
        { price: '100.5', quantity: '1' },
        { price: '100.7', quantity: '2' },
        { price: '101.2', quantity: '3' }
      ],
      asks: [
        { price: '102.1', quantity: '1' },
        { price: '102.5', quantity: '2' }
      ]
    }

    const result = processOrderBookData(data, tickSize)

    // Prices should be rounded down to nearest tick (1)
    expect(result.bids).toHaveLength(2)
    expect(result.bids[0].price).toBe(101)
    expect(result.bids[0].quantity).toBe(3)
    expect(result.bids[1].price).toBe(100)
    expect(result.bids[1].quantity).toBe(3) // 1 + 2

    expect(result.asks).toHaveLength(1)
    expect(result.asks[0].price).toBe(102)
    expect(result.asks[0].quantity).toBe(3) // 1 + 2 (both 102.1 and 102.5 round to 102)
  })

  it('should skip zero quantity orders', () => {
    const data: OrderBookData = {
      lastUpdateId: 1234567890,
      symbol: 'BTCUSDT',
      timestamp: Date.now(),
      bids: [
        { price: '100', quantity: '1' },
        { price: '101', quantity: '0' },
        { price: '102', quantity: '2' }
      ],
      asks: []
    }

    const result = processOrderBookData(data, tickSize)

    expect(result.bids).toHaveLength(2)
    expect(result.bids.some(bid => bid.price === 101)).toBe(false)
  })

  it('should sort bids in descending order', () => {
    const data: OrderBookData = {
      lastUpdateId: 1234567890,
      symbol: 'BTCUSDT',
      timestamp: Date.now(),
      bids: [
        { price: '100', quantity: '1' },
        { price: '103', quantity: '1' },
        { price: '101', quantity: '1' }
      ],
      asks: []
    }

    const result = processOrderBookData(data, tickSize)

    expect(result.bids[0].price).toBe(103)
    expect(result.bids[1].price).toBe(101)
    expect(result.bids[2].price).toBe(100)
  })

  it('should sort asks in descending order', () => {
    const data: OrderBookData = {
      lastUpdateId: 1234567890,
      symbol: 'BTCUSDT',
      timestamp: Date.now(),
      bids: [],
      asks: [
        { price: '100', quantity: '1' },
        { price: '103', quantity: '1' },
        { price: '101', quantity: '1' }
      ]
    }

    const result = processOrderBookData(data, tickSize)

    expect(result.asks[0].price).toBe(103)
    expect(result.asks[1].price).toBe(101)
    expect(result.asks[2].price).toBe(100)
  })

  it('should calculate cumulative totals for bids', () => {
    const data: OrderBookData = {
      lastUpdateId: 1234567890,
      symbol: 'BTCUSDT',
      timestamp: Date.now(),
      bids: [
        { price: '103', quantity: '1' },
        { price: '102', quantity: '2' },
        { price: '101', quantity: '3' }
      ],
      asks: []
    }

    const result = processOrderBookData(data, tickSize)

    expect(result.bids[0].total).toBe(1)
    expect(result.bids[1].total).toBe(3) // 1 + 2
    expect(result.bids[2].total).toBe(6) // 1 + 2 + 3
  })

  it('should calculate cumulative totals for asks', () => {
    const data: OrderBookData = {
      lastUpdateId: 1234567890,
      symbol: 'BTCUSDT',
      timestamp: Date.now(),
      bids: [],
      asks: [
        { price: '100', quantity: '1' },
        { price: '101', quantity: '2' },
        { price: '102', quantity: '3' }
      ]
    }

    const result = processOrderBookData(data, tickSize)

    // Process: sort desc [102, 101, 100] -> reverse [100, 101, 102] -> accumulate [1, 3, 6] -> reverse [6, 3, 1]
    // Result: asks[0] = 102, asks[1] = 101, asks[2] = 100
    expect(result.asks[0].price).toBe(102)
    expect(result.asks[0].quantity).toBe(3)
    expect(result.asks[0].total).toBe(6) // 1 + 2 + 3

    expect(result.asks[1].price).toBe(101)
    expect(result.asks[1].quantity).toBe(2)
    expect(result.asks[1].total).toBe(3) // 1 + 2

    expect(result.asks[2].price).toBe(100)
    expect(result.asks[2].quantity).toBe(1)
    expect(result.asks[2].total).toBe(1) // just 1
  })

  it('should handle empty bids and asks', () => {
    const data: OrderBookData = {
      lastUpdateId: 1234567890,
      symbol: 'BTCUSDT',
      timestamp: Date.now(),
      bids: [],
      asks: []
    }

    const result = processOrderBookData(data, tickSize)

    expect(result.bids).toHaveLength(0)
    expect(result.asks).toHaveLength(0)
  })

  it('should preserve symbol and timestamp', () => {
    const timestamp = Date.now()
    const data: OrderBookData = {
      lastUpdateId: 1234567890,
      symbol: 'ETHUSDT',
      timestamp,
      bids: [{ price: '100', quantity: '1' }],
      asks: []
    }

    const result = processOrderBookData(data, tickSize)

    expect(result.symbol).toBe('ETHUSDT')
    expect(result.timestamp).toBe(timestamp)
  })

  it('should handle different tick sizes', () => {
    const data: OrderBookData = {
      lastUpdateId: 1234567890,
      symbol: 'BTCUSDT',
      timestamp: Date.now(),
      bids: [
        { price: '100.1', quantity: '1' },
        { price: '100.2', quantity: '2' },
        { price: '100.9', quantity: '3' }
      ],
      asks: []
    }

    const result = processOrderBookData(data, 0.5)

    // With tick size 0.5:
    // 100.1 -> floor(100.1/0.5)*0.5 = 100
    // 100.2 -> floor(100.2/0.5)*0.5 = 100
    // 100.9 -> floor(100.9/0.5)*0.5 = 100.5
    expect(result.bids).toHaveLength(2)
    expect(result.bids[0].price).toBe(100.5)
    expect(result.bids[0].quantity).toBe(3)
    expect(result.bids[1].price).toBe(100)
    expect(result.bids[1].quantity).toBe(3) // 1 + 2
  })

  it('should handle decimal prices correctly', () => {
    const data: OrderBookData = {
      lastUpdateId: 1234567890,
      symbol: 'BTCUSDT',
      timestamp: Date.now(),
      bids: [
        { price: '100.123', quantity: '1' },
        { price: '100.456', quantity: '2' }
      ],
      asks: []
    }

    const result = processOrderBookData(data, 1)

    expect(result.bids).toHaveLength(1)
    expect(result.bids[0].price).toBe(100)
    expect(result.bids[0].quantity).toBe(3)
  })
})
