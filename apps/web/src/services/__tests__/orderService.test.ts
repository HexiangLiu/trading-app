import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OrderSide, OrderStatus, OrderType } from '@/types/order'
import { orderService } from '../orderService'

describe('OrderService', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should submit an order successfully', async () => {
    const formData = {
      price: '10000.00',
      quantity: '0.01',
      side: OrderSide.BUY,
      postOnly: false
    }

    const orderPromise = orderService.submitOrder(
      formData,
      'BTCUSDT',
      'binance'
    )

    // Advance timers to complete the delay
    await vi.advanceTimersByTimeAsync(250)

    const order = await orderPromise

    expect(order).toBeDefined()
    expect(order.symbol).toBe('BTCUSDT')
    expect(order.exchange).toBe('binance')
    expect(order.side).toBe(OrderSide.BUY)
    expect(order.type).toBe(OrderType.LIMIT)
    expect(order.price).toBe(10000.0)
    expect(order.quantity).toBe(0.01)
    expect(order.postOnly).toBe(false)
    expect(order.timestamp).toBeDefined()
    expect(order.id).toContain('order_')
  })

  it('should handle SELL orders', async () => {
    const formData = {
      price: '50000.00',
      quantity: '0.5',
      side: OrderSide.SELL,
      postOnly: true
    }

    const orderPromise = orderService.submitOrder(
      formData,
      'ETHUSDT',
      'binance'
    )
    await vi.advanceTimersByTimeAsync(250)

    const order = await orderPromise

    expect(order.side).toBe(OrderSide.SELL)
    expect(order.postOnly).toBe(true)
    expect(order.symbol).toBe('ETHUSDT')
  })

  it('should generate unique order IDs', async () => {
    const formData = {
      price: '100',
      quantity: '1',
      side: OrderSide.BUY,
      postOnly: false
    }

    const order1Promise = orderService.submitOrder(
      formData,
      'BTCUSDT',
      'binance'
    )
    await vi.advanceTimersByTimeAsync(250)
    const order1 = await order1Promise

    // Small delay to ensure different timestamp
    await vi.advanceTimersByTimeAsync(1)

    const order2Promise = orderService.submitOrder(
      formData,
      'BTCUSDT',
      'binance'
    )
    await vi.advanceTimersByTimeAsync(250)
    const order2 = await order2Promise

    expect(order1.id).not.toBe(order2.id)
  })

  it('should return order with timestamp', async () => {
    const formData = {
      price: '100',
      quantity: '1',
      side: OrderSide.BUY,
      postOnly: false
    }

    const mockTimestamp = 1234567890
    vi.spyOn(Date, 'now').mockReturnValue(mockTimestamp)

    const orderPromise = orderService.submitOrder(
      formData,
      'BTCUSDT',
      'binance'
    )
    await vi.advanceTimersByTimeAsync(250)
    const order = await orderPromise

    expect(order.timestamp).toBe(mockTimestamp)
  })

  it('should simulate network delay', async () => {
    // Mock Math.random to ensure consistent delay
    vi.spyOn(Math, 'random').mockReturnValue(0)

    const formData = {
      price: '100',
      quantity: '1',
      side: OrderSide.BUY,
      postOnly: false
    }

    const orderPromise = orderService.submitOrder(
      formData,
      'BTCUSDT',
      'binance'
    )

    // With Math.random mocked to 0, delay is 0 * 200 + 50 = 50ms
    await vi.advanceTimersByTimeAsync(50)

    const order = await orderPromise
    expect(order).toBeDefined()
  })

  it('should return status of PENDING or REJECTED', async () => {
    const formData = {
      price: '100',
      quantity: '1',
      side: OrderSide.BUY,
      postOnly: false
    }

    const orderPromise = orderService.submitOrder(
      formData,
      'BTCUSDT',
      'binance'
    )
    await vi.advanceTimersByTimeAsync(250)
    const order = await orderPromise

    expect([OrderStatus.PENDING, OrderStatus.REJECTED]).toContain(order.status)
  })
})
