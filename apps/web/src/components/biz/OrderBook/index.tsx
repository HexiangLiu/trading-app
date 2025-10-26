import { useAtomValue } from 'jotai'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { exchangeAdapterManager } from '@/adapters'
import { useVisibleRows } from '@/hooks/useVisibleRows'
import { instrumentAtom } from '@/store/instrument'
import { InstrumentName } from '@/types/instrument'
import type { OrderBookData, ProcessedOrderBook } from '@/types/orderbook'
import { throttle } from '@/utils/throttle'
import { OrderBookRow } from './Row'
import { processOrderBookData } from './utils/processData'

const TICK_SIZE_MAP = {
  [InstrumentName.BTCUSDT]: 0.01,
  [InstrumentName.ETHUSDT]: 0.01,
  [InstrumentName.SOLUSDT]: 0.01
}

export const OrderBook = memo(() => {
  const [orderBookData, setOrderBookData] = useState<ProcessedOrderBook | null>(
    null
  )
  const instrument = useAtomValue(instrumentAtom)
  const askContainerRef = useRef<HTMLDivElement | null>(null)
  const bidContainerRef = useRef<HTMLDivElement | null>(null)

  const rowHeight = 28 // Height of each row in pixels
  const tickSize = useMemo(() => {
    return TICK_SIZE_MAP[instrument.name]
  }, [instrument.name])

  // Use visible rows hook to get total visible rows
  const { containerRef, totalVisibleRows } = useVisibleRows({
    rowHeight
  })

  // Split rows between asks and bids (each gets half)
  const visibleRowsPerSection = useMemo(() => {
    return Math.floor(totalVisibleRows / 2) + 1
  }, [totalVisibleRows])

  // Get visible data for asks (from low to high)
  const visibleAsks = useMemo(() => {
    if (!orderBookData) return []
    const asks = orderBookData.asks
    return asks.slice(asks.length - visibleRowsPerSection)
  }, [orderBookData, visibleRowsPerSection])

  // Get visible data for bids (from high to low)
  const visibleBids = useMemo(() => {
    if (!orderBookData) return []
    const bids = orderBookData.bids
    return bids.slice(0, visibleRowsPerSection)
  }, [orderBookData, visibleRowsPerSection])

  // Process raw order book data
  const processAndUpdateData = useCallback(
    (data: OrderBookData, tickSize: number) => {
      const processedData = processOrderBookData(data, tickSize)
      setOrderBookData(processedData)
    },
    []
  )

  // Create throttled callback using utils function
  const throttledUpdate = useMemo(
    () =>
      throttle((data: OrderBookData) => {
        processAndUpdateData(data, tickSize)
      }, 200),
    [processAndUpdateData, tickSize]
  )

  useEffect(() => {
    // Subscribe to depth stream for current instrument
    exchangeAdapterManager.subscribe(instrument.exchange, {
      symbol: instrument.name,
      streamType: 'depth',
      callback: throttledUpdate
    })

    // Cleanup: unsubscribe when component unmounts or instrument changes
    return () => {
      exchangeAdapterManager.unsubscribe(
        instrument.exchange,
        instrument.name,
        'depth',
        undefined, // interval
        throttledUpdate
      )
    }
  }, [instrument, throttledUpdate])

  // Handle scrolling when visible rows change
  useEffect(() => {
    if (totalVisibleRows === 0) return

    const timer = setTimeout(() => {
      // For ask container with justify-end, scroll to bottom to show latest data
      if (askContainerRef.current) {
        askContainerRef.current.scrollTo({
          top: askContainerRef.current.scrollHeight,
          behavior: 'smooth'
        })
      }
      // For bid container, scroll to top to show latest data
      if (bidContainerRef.current) {
        bidContainerRef.current.scrollTo({
          top: 0,
          behavior: 'smooth'
        })
      }
    }, 0)

    return () => clearTimeout(timer)
  }, [totalVisibleRows])

  // Memoized max total for performance (using visible data only)
  const maxTotal = useMemo(() => {
    if (!orderBookData) return 0
    const allTotals = [
      ...visibleBids.map(b => b.total),
      ...visibleAsks.map(a => a.total)
    ]
    return Math.max(...allTotals)
  }, [orderBookData, visibleBids, visibleAsks])

  if (!orderBookData) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p>Loading order book...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <h3 className="font-semibold text-lg">Order Book</h3>
      </div>

      {/* Column Headers */}
      <div className="flex items-center justify-between px-3 py-2  border-b border-gray-700 text-xs text-gray-400">
        <span>Price(USDT)</span>
        <span>Size(USDT)</span>
        <span>Sum(USDT)</span>
      </div>

      {/* Order Book Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col" ref={containerRef}>
          {/* Asks (Sell orders) - displayed at top, but data flows from bottom */}
          <div
            style={{ height: `${visibleRowsPerSection * rowHeight}px` }}
            className="overflow-y-auto"
            ref={askContainerRef}
          >
            <div
              className="space-y-0 flex flex-col justify-end min-h-full"
              style={{ minHeight: `${visibleRowsPerSection * rowHeight}px` }}
            >
              {visibleAsks.map((entry, index) => (
                <OrderBookRow
                  key={`ask-${index}-${entry.price}`}
                  entry={entry}
                  type="ask"
                  maxTotal={maxTotal}
                />
              ))}
            </div>
          </div>

          {/* Bids (Buy orders) - displayed at bottom */}
          <div
            style={{ height: `${visibleRowsPerSection * rowHeight}px` }}
            className="overflow-y-auto"
            ref={bidContainerRef}
          >
            <div className="space-y-0 h-full">
              {visibleBids.map((entry, index) => (
                <OrderBookRow
                  key={`bid-${index}-${entry.price}`}
                  entry={entry}
                  type="bid"
                  maxTotal={maxTotal}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

OrderBook.displayName = 'OrderBook'
