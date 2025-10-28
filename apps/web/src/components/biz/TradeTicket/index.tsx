import { useAtomValue, useSetAtom } from 'jotai'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { exchangeAdapterManager } from '@/adapters'
import { orderService } from '@/services/orderService'
import { instrumentAtom } from '@/store/instrument'
import { orderAtom } from '@/store/order'
import { positionsAtom } from '@/store/pnl'
import type { OrderFormData } from '@/types/order'
import { OrderSide, OrderStatus } from '@/types/order'
import { cn } from '@/utils/classMerge'
import { sanitizeInput } from '@/utils/sanitize'
import { validateOrder } from './utils/validation'

export const TradeTicket = memo(() => {
  const instrument = useAtomValue(instrumentAtom)
  const setOrders = useSetAtom(orderAtom)
  const positions = useAtomValue(positionsAtom)

  const [formData, setFormData] = useState<OrderFormData>({
    price: '',
    quantity: '',
    side: OrderSide.BUY,
    postOnly: false
  })

  const [bestBid, setBestBid] = useState<number>(0)
  const [bestAsk, setBestAsk] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Track if price has been initialized and previous side
  const priceInitializedRef = useRef(false)
  const previousSideRef = useRef<OrderSide | null>(null)
  const previousInstrumentRef = useRef<string | null>(null)

  const ticker = useMemo(() => {
    return instrument.name.replace('usdt', '').toUpperCase()
  }, [instrument.name])

  // Get real-time best bid/ask from order book
  useEffect(() => {
    // Set up callback to get best bid/ask
    const handleOrderBookUpdate = (data: any) => {
      if (data.bids && data.bids.length > 0) {
        setBestBid(parseFloat(data.bids[0].price))
      }
      if (data.asks && data.asks.length > 0) {
        setBestAsk(parseFloat(data.asks[0].price))
      }
    }

    // Subscribe to depth stream
    exchangeAdapterManager.subscribe(instrument.exchange, {
      symbol: instrument.name,
      streamType: 'depth',
      callback: handleOrderBookUpdate
    })

    // Cleanup: unsubscribe when component unmounts or instrument changes
    return () => {
      exchangeAdapterManager.unsubscribe(
        instrument.exchange,
        instrument.name,
        'depth',
        undefined,
        handleOrderBookUpdate
      )
    }
  }, [instrument])

  // Reset price initialization when instrument changes
  useEffect(() => {
    if (
      previousInstrumentRef.current !== null &&
      previousInstrumentRef.current !== instrument.name
    ) {
      priceInitializedRef.current = false
      previousSideRef.current = null
    }
    previousInstrumentRef.current = instrument.name
  }, [instrument.name])

  // Update form with best prices when first time load, side changes, or instrument changes
  useEffect(() => {
    if (bestBid > 0 && bestAsk > 0) {
      const isFirstTime = !priceInitializedRef.current
      const isSideChanged =
        previousSideRef.current !== null &&
        previousSideRef.current !== formData.side

      if (isFirstTime || isSideChanged) {
        if (formData.side === OrderSide.BUY) {
          setFormData(prev => ({ ...prev, price: bestBid.toFixed(2) }))
        } else if (formData.side === OrderSide.SELL) {
          setFormData(prev => ({ ...prev, price: bestAsk.toFixed(2) }))
        }
        priceInitializedRef.current = true
      }

      previousSideRef.current = formData.side
    }
  }, [bestBid, bestAsk, formData.side])

  const handleInputChange = useCallback(
    (field: keyof OrderFormData, value: string | boolean) => {
      // Sanitize all string inputs to prevent XSS attacks
      if (typeof value === 'string') {
        value = sanitizeInput(value)
      }
      setFormData(prev => ({ ...prev, [field]: value }))
    },
    []
  )

  const handleSideChange = useCallback(
    (side: OrderSide) => {
      setFormData(prev => ({
        ...prev,
        side,
        price: side === OrderSide.BUY ? bestBid.toFixed(2) : bestAsk.toFixed(2)
      }))
    },
    [bestBid, bestAsk]
  )

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      if (isSubmitting) return
      e.preventDefault()
      setIsSubmitting(true)
      const validationResult = validateOrder(
        formData,
        bestBid,
        bestAsk,
        positions,
        instrument.name,
        instrument.exchange
      )
      if (!validationResult.isValid) {
        toast.error(validationResult.errors.join(', '))
        setIsSubmitting(false)
        return
      }

      try {
        const order = await orderService.submitOrder(
          formData,
          instrument.name,
          instrument.exchange
        )

        // Add order to atom storage
        setOrders(prev => [...prev, order])

        if (order.status === OrderStatus.PENDING) {
          toast.success(`Order accepted successfully`)
          // Reset form
          setFormData({
            price: '',
            quantity: '',
            side: formData.side,
            postOnly: false
          })
        } else {
          toast.error(`Order was rejected`)
        }
      } catch (error) {
        toast.error('Failed to submit order')
        console.error('Order submission error:', error)
      } finally {
        setIsSubmitting(false)
      }
    },
    [
      formData,
      isSubmitting,
      instrument.name,
      instrument.exchange,
      bestBid,
      bestAsk,
      setOrders,
      positions
    ]
  )

  return (
    <div className="h-full bg-gray-200 dark:bg-neutral-900 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Trade Ticket
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Order Side */}
        <div>
          <div className="flex space-x-2">
            <button
              type="button"
              data-testid="side-buy"
              onClick={() => handleSideChange(OrderSide.BUY)}
              className={cn(
                'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors cursor-pointer',
                formData.side === OrderSide.BUY
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              BUY
            </button>
            <button
              type="button"
              data-testid="side-sell"
              onClick={() => handleSideChange(OrderSide.SELL)}
              className={cn(
                'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors cursor-pointer',
                formData.side === OrderSide.SELL
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              SELL
            </button>
          </div>
        </div>

        {/* Price */}
        <div>
          <label
            htmlFor="price"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Price (USDT)
          </label>
          <input
            id="price"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={e => handleInputChange('price', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0.00"
          />
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Bid: {bestBid.toFixed(2)}</span>
            <span>Ask: {bestAsk.toFixed(2)}</span>
          </div>
        </div>

        {/* Quantity */}
        <div>
          <label
            htmlFor="quantity"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Quantity ({ticker})
          </label>
          <input
            id="quantity"
            type="number"
            step="0.000001"
            value={formData.quantity}
            onChange={e => handleInputChange('quantity', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0.000000"
          />
        </div>

        {/* Post Only */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="postOnly"
            checked={formData.postOnly}
            onChange={e => handleInputChange('postOnly', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded cursor-pointer"
          />
          <label
            htmlFor="postOnly"
            className="ml-2 text-sm text-gray-700 dark:text-gray-300"
          >
            Post Only
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          data-testid="submit-order"
          disabled={isSubmitting}
          className={cn(
            'w-full py-2 px-4 rounded-md text-sm font-medium transition-colors cursor-pointer',
            !isSubmitting
              ? formData.side === OrderSide.BUY
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
          )}
        >
          {isSubmitting ? 'Submitting...' : `${formData.side} ${ticker}`}
        </button>
      </form>
    </div>
  )
})
