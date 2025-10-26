/**
 * Order related types
 */

export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum OrderType {
  LIMIT = 'LIMIT'
}

export enum OrderStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED'
}

export interface Order {
  id: string
  symbol: string
  side: OrderSide
  type: OrderType
  price: number
  quantity: number
  postOnly: boolean
  status: OrderStatus
  timestamp: number
  filledQuantity?: number
  averagePrice?: number
}

export interface OrderFormData {
  price: string
  quantity: string
  side: OrderSide
  postOnly: boolean
}

export interface OrderValidation {
  isValid: boolean
  errors: string[]
}
