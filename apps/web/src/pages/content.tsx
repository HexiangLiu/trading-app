import { useAtom } from 'jotai'
import { memo, useCallback, useMemo } from 'react'
import { type Layout, Responsive, WidthProvider } from 'react-grid-layout'
import { InstrumentSelector } from '@/components/biz/InstrumentSelector'
import { OrderBook } from '@/components/biz/OrderBook'
import { PositionsWidget } from '@/components/biz/PositionsWidget'
import { TradeTicket } from '@/components/biz/TradeTicket'
import { TradingViewChart } from '@/components/biz/TradingViewChart'
import { layoutAtom } from '@/store/layout'
import { throttle } from '@/utils/throttle'
import 'react-grid-layout/css/styles.css'

const ResponsiveGridLayout = WidthProvider(Responsive)

const DragHandle = () => (
  <span className="drag-handle absolute opacity-10 h-2 top-0 inset-x-0 mx-auto block z-10 cursor-grab active:cursor-grabbing" />
)

export const Content = memo(() => {
  const [layouts, setLayouts] = useAtom(layoutAtom)

  const handleLayoutChange = useCallback(
    (layout: Layout[]) => {
      setLayouts({ lg: layout })
    },
    [setLayouts]
  )

  const dispatchResizeEvent = useCallback(() => {
    const event = new CustomEvent('gridlayoutresize')
    document.dispatchEvent(event)
  }, [])

  const throttledDispatchResize = useMemo(
    () => throttle(dispatchResizeEvent, 100),
    [dispatchResizeEvent]
  )

  const handleResize = useCallback(
    (
      _layout: Layout[],
      _oldItem: Layout,
      _newItem: Layout,
      _placeholder: Layout
    ) => {
      throttledDispatchResize()
    },
    [throttledDispatchResize]
  )
  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      breakpoints={{ lg: 1200 }}
      cols={{ lg: 12 }}
      rowHeight={70}
      isDraggable={true}
      isResizable={true}
      margin={[4, 4]}
      containerPadding={[0, 0]}
      useCSSTransforms={true}
      transformScale={1}
      preventCollision={false}
      compactType="vertical"
      allowOverlap={false}
      onLayoutChange={handleLayoutChange}
      onResize={handleResize}
      draggableHandle=".drag-handle"
    >
      <div
        key="instrument"
        className="relative flex items-center bg-gray-200 dark:bg-neutral-900 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700"
      >
        <DragHandle />
        <InstrumentSelector />
      </div>

      <div
        key="chart"
        className="relative bg-gray-200 dark:bg-neutral-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700"
      >
        <DragHandle />
        <TradingViewChart />
      </div>

      <div
        key="orderbook"
        className="relative bg-gray-200 dark:bg-neutral-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700"
      >
        <DragHandle />
        <div className="pt-4 h-full">
          <OrderBook />
        </div>
      </div>

      <div
        key="ticket"
        className="relative bg-gray-200 dark:bg-neutral-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700"
      >
        <DragHandle />
        <div className="-4 h-full">
          <TradeTicket />
        </div>
      </div>

      <div
        key="positions"
        className="relative bg-gray-200 dark:bg-neutral-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-y-auto"
      >
        <DragHandle />
        <div className="p-4 h-full">
          <PositionsWidget />
        </div>
      </div>
    </ResponsiveGridLayout>
  )
})
