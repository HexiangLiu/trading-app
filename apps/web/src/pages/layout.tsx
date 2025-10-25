import { useAtom } from 'jotai'
import { type Layout, Responsive, WidthProvider } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import { InstrumentSelector } from '../components/biz/InstrumentSelector'
import { OrderBook } from '../components/biz/OrderBook'
import { PositionsWidget } from '../components/biz/PositionsWidget'
import { TradeTicket } from '../components/biz/TradeTicket'
import { TradingViewChart } from '../components/biz/TradingViewChart'
import { layoutAtom } from '../store/layout'
import { darkModeAtom } from '../store/theme'

const ResponsiveGridLayout = WidthProvider(Responsive)

const DragHandle = () => (
  <span className="drag-handle absolute opacity-10 h-2 top-0 inset-x-0 mx-auto block z-10 cursor-grab active:cursor-grabbing" />
)

const TradingLayout: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useAtom(darkModeAtom)
  const [layouts, setLayouts] = useAtom(layoutAtom)

  const handleLayoutChange = (layout: Layout[]) => {
    setLayouts({ lg: layout })
  }

  return (
    <div
      className={`w-dvw h-dvh overflow-y-auto ${isDarkMode ? 'dark' : ''} ${
        isDarkMode ? 'bg-black text-white' : 'bg-white text-gray-900'
      }`}
    >
      <div className="w-full h-full">
        <div className="flex justify-between items-center mb-1 dark:bg-neutral-900 bg-gray-100">
          <h1
            className={`text-xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            Trading Dashboard
          </h1>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`px-4 py-2 rounded-lg transition-colors cursor-pointer ${
              isDarkMode
                ? 'bg-gray-800 text-white hover:bg-gray-700 border border-gray-700'
                : 'bg-gray-200 text-gray-900 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>

        <div>
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
            draggableHandle=".drag-handle"
          >
            <div
              key="instrument"
              className="relative flex items-center bg-gray-100 dark:bg-neutral-900 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700"
            >
              <DragHandle />
              <InstrumentSelector />
            </div>

            <div
              key="chart"
              className="relative bg-gray-100 dark:bg-neutral-900 rounded-lg shadow-md border border-gray-700 dark:border-gray-700"
            >
              <DragHandle />
              <TradingViewChart />
            </div>

            <div
              key="orderbook"
              className="relative bg-gray-100 dark:bg-neutral-900 rounded-lg shadow-md border border-gray-700 dark:border-gray-700"
            >
              <DragHandle />
              <div className="p-4 h-full">
                <OrderBook />
              </div>
            </div>

            <div
              key="ticket"
              className="relative bg-gray-100 dark:bg-neutral-900 rounded-lg shadow-md border border-gray-700 dark:border-gray-700"
            >
              <DragHandle />
              <div className="p-4 h-full">
                <TradeTicket />
              </div>
            </div>

            <div
              key="positions"
              className="relative bg-gray-100 dark:bg-neutral-900 rounded-lg shadow-md border border-gray-700 dark:border-gray-700"
            >
              <DragHandle />
              <div className="p-4 h-full">
                <PositionsWidget />
              </div>
            </div>
          </ResponsiveGridLayout>
        </div>
      </div>
    </div>
  )
}

export default TradingLayout
