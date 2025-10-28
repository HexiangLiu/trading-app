import { describe, expect, it } from 'vitest'
import type { OrderFormData } from '@/types/order'
import { OrderSide } from '@/types/order'
import type { Position } from '@/workers/tradeAggregator'
import { validateOrder } from '../validation'

describe('validateOrder', () => {
  const mockFormData: OrderFormData = {
    price: '10000.00',
    quantity: '0.01',
    side: OrderSide.BUY,
    postOnly: false
  }

  const bestBid = 9999
  const bestAsk = 10001

  it('should validate correct order data', () => {
    const result = validateOrder(mockFormData, bestBid, bestAsk)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject invalid price', () => {
    const invalidData = { ...mockFormData, price: 'invalid' }
    const result = validateOrder(invalidData, bestBid, bestAsk)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Price must be a positive number')
  })

  it('should reject negative price', () => {
    const invalidData = { ...mockFormData, price: '-100' }
    const result = validateOrder(invalidData, bestBid, bestAsk)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Price must be a positive number')
  })

  it('should reject zero price', () => {
    const invalidData = { ...mockFormData, price: '0' }
    const result = validateOrder(invalidData, bestBid, bestAsk)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Price must be a positive number')
  })

  it('should reject invalid quantity', () => {
    const invalidData = { ...mockFormData, quantity: 'invalid' }
    const result = validateOrder(invalidData, bestBid, bestAsk)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Quantity must be a positive number')
  })

  it('should reject quantity below minimum', () => {
    const invalidData = { ...mockFormData, quantity: '0.0001' }
    const result = validateOrder(invalidData, bestBid, bestAsk)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Minimum order size is 0.001')
  })

  it('should reject price with more than 2 decimal places', () => {
    const invalidData = { ...mockFormData, price: '10000.123' }
    const result = validateOrder(invalidData, bestBid, bestAsk)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Price can have at most 2 decimal places')
  })

  it('should reject quantity with more than 6 decimal places', () => {
    const invalidData = { ...mockFormData, quantity: '0.1234567' }
    const result = validateOrder(invalidData, bestBid, bestAsk)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain(
      'Quantity can have at most 6 decimal places'
    )
  })

  describe('post-only orders', () => {
    it('should reject BUY post-only order with price >= best ask', () => {
      const data = { ...mockFormData, postOnly: true, price: '10100.00' }
      const result = validateOrder(data, bestBid, bestAsk)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(
        'Buy post-only orders must be below the best ask'
      )
    })

    it('should accept BUY post-only order with price < best ask', () => {
      const data = { ...mockFormData, postOnly: true, price: '10000.00' }
      const result = validateOrder(data, bestBid, bestAsk)
      expect(result.isValid).toBe(true)
    })

    it('should reject SELL post-only order with price <= best bid', () => {
      const data = {
        ...mockFormData,
        side: OrderSide.SELL,
        postOnly: true,
        price: '9900.00'
      }
      const result = validateOrder(data, bestBid, bestAsk)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(
        'Sell post-only orders must be above the best bid'
      )
    })

    it('should accept SELL post-only order with price > best bid', () => {
      const data = {
        ...mockFormData,
        side: OrderSide.SELL,
        postOnly: true,
        price: '10100.00'
      }
      const result = validateOrder(data, bestBid, bestAsk)
      expect(result.isValid).toBe(true)
    })
  })

  describe('SELL order position validation', () => {
    const positions: Position[] = [
      {
        symbol: 'BTCUSDT',
        exchange: 'binance',
        quantity: 0.01,
        averagePrice: 50000,
        unrealizedPnL: 0,
        realizedPnL: 0,
        lastUpdate: Date.now()
      }
    ]

    it('should reject SELL order without position', () => {
      const data = { ...mockFormData, side: OrderSide.SELL }
      const result = validateOrder(
        data,
        bestBid,
        bestAsk,
        [],
        'BTCUSDT',
        'binance'
      )
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('No open position for this instrument')
    })

    it('should reject SELL order with insufficient position', () => {
      const data = { ...mockFormData, side: OrderSide.SELL, quantity: '0.02' }
      const result = validateOrder(
        data,
        bestBid,
        bestAsk,
        positions,
        'BTCUSDT',
        'binance'
      )
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain(
        'Insufficient position. Available: 0.010000'
      )
    })

    it('should accept SELL order with sufficient position', () => {
      const data = { ...mockFormData, side: OrderSide.SELL, quantity: '0.01' }
      const result = validateOrder(
        data,
        bestBid,
        bestAsk,
        positions,
        'BTCUSDT',
        'binance'
      )
      expect(result.isValid).toBe(true)
    })

    it('should skip position validation for BUY orders', () => {
      const data = { ...mockFormData, side: OrderSide.BUY }
      const result = validateOrder(
        data,
        bestBid,
        bestAsk,
        [],
        'BTCUSDT',
        'binance'
      )
      expect(result.isValid).toBe(true)
    })
  })

  it('should accumulate multiple errors', () => {
    const invalidData = {
      ...mockFormData,
      price: 'invalid',
      quantity: '0.0001'
    }
    const result = validateOrder(invalidData, bestBid, bestAsk)
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(1)
  })
})
