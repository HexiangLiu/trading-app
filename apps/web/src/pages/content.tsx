import { useAtom } from 'jotai'
import {
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react'
import {
  type Layout,
  type Layouts,
  Responsive,
  WidthProvider
} from 'react-grid-layout'
import { InstrumentSelector } from '@/components/biz/InstrumentSelector'
import { OrderBook } from '@/components/biz/OrderBook'
import { PositionsWidget } from '@/components/biz/PositionsWidget'
import { TradeTicket } from '@/components/biz/TradeTicket'
import { layoutAtom } from '@/store/layout'
import { throttle } from '@/utils/throttle'
import 'react-grid-layout/css/styles.css'

const TradingViewChart = lazy(() =>
  import('@/components/biz/TradingViewChart').then(module => ({
    default: module.TradingViewChart
  }))
)

const ResponsiveGridLayout = WidthProvider(Responsive)

const DragHandle = () => (
  <span className="hidden lg:inline-block drag-handle absolute opacity-10 h-2 top-0 inset-x-0 mx-auto z-10 cursor-grab active:cursor-grabbing" />
)

export const Content = memo(() => {
  const [layouts, setLayouts] = useAtom(layoutAtom)
  const [isLargeScreen, setIsLargeScreen] = useState(false)

  useEffect(() => {
    const checkScreenSize = throttle(() => {
      setIsLargeScreen(window.innerWidth >= 1024)
    }, 200)
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  const handleLayoutChange = useCallback(
    (_layout: Layout[], allLayouts: Layouts) => {
      setLayouts(allLayouts)
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
      breakpoints={{ md: 1024, sm: 768, xs: 640, xxs: 320 }}
      cols={{ md: 12, sm: 12, xs: 12, xxs: 12 }}
      rowHeight={70}
      isDraggable={isLargeScreen}
      isResizable={isLargeScreen}
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
        className="relative flex items-center bg-gray-200 dark:bg-neutral-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700"
      >
        <DragHandle />
        <InstrumentSelector />
      </div>

      <div
        key="chart"
        className="relative bg-gray-200 dark:bg-neutral-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700"
      >
        <DragHandle />
        <Suspense
          fallback={
            <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
              <div className="w-12 h-12 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
            </div>
          }
        >
          <TradingViewChart />
        </Suspense>
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
        <div className="p-0 sm:p-4 h-full">
          <TradeTicket />
        </div>
      </div>

      <div
        key="positions"
        className="relative bg-gray-200 dark:bg-neutral-900 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-y-auto"
      >
        <DragHandle />
        <div className="p-0 sm:p-4 h-full">
          <PositionsWidget />
        </div>
      </div>
    </ResponsiveGridLayout>
  )
})
