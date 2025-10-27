import type { Order, OrderFormData } from '@/types/order'
import { OrderStatus, OrderType } from '@/types/order'

/**
 * Mock order service for simulating order placement
 */
export class OrderService {
  /**
   * Submit a new order (mock implementation)
   */
  async submitOrder(
    formData: OrderFormData,
    symbol: string,
    exchange: string
  ): Promise<Order> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50))

    // Generate mock order
    const order: Order = {
      id: this.generateOrderId(),
      symbol,
      exchange,
      side: formData.side,
      type: OrderType.LIMIT,
      price: parseFloat(formData.price),
      quantity: parseFloat(formData.quantity),
      postOnly: formData.postOnly,
      status: this.simulateOrderStatus(),
      timestamp: Date.now()
    }

    return order
  }

  /**
   * Generate a unique order ID
   */
  private generateOrderId(): string {
    return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Simulate order status (90% accepted, 10% rejected)
   */
  private simulateOrderStatus(): OrderStatus {
    return Math.random() > 0.1 ? OrderStatus.PENDING : OrderStatus.REJECTED
  }
}
