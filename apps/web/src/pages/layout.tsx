import { useAtom } from 'jotai'
import { type Layout, Responsive, WidthProvider } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import { InstrumentSelector } from '../components/InstrumentSelector'
import { OrderBook } from '../components/OrderBook'
import { PositionsWidget } from '../components/PositionsWidget'
import { TradeTicket } from '../components/TradeTicket'
import { TradingViewChart } from '../components/TradingViewChart'
import { layoutAtom } from '../store/layout'
import { darkModeAtom } from '../store/theme'

const ResponsiveGridLayout = WidthProvider(Responsive)

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

        {/* lg screen: use react-grid-layout */}
        <div className="hidden lg:block">
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
          >
            <div
              key="instrument"
              className="bg-gray-900 dark:bg-gray-900 rounded-lg shadow-md border border-gray-700 dark:border-gray-700"
            >
              <div className="p-4 h-full">
                <InstrumentSelector />
              </div>
            </div>

            <div
              key="chart"
              className="bg-gray-900 dark:bg-gray-900 rounded-lg shadow-md border border-gray-700 dark:border-gray-700"
            >
              <div className="p-4 h-full">
                <TradingViewChart />
              </div>
            </div>

            <div
              key="orderbook"
              className="bg-gray-900 dark:bg-gray-900 rounded-lg shadow-md border border-gray-700 dark:border-gray-700"
            >
              <div className="p-4 h-full">
                <OrderBook />
              </div>
            </div>

            <div
              key="ticket"
              className="bg-gray-900 dark:bg-gray-900 rounded-lg shadow-md border border-gray-700 dark:border-gray-700"
            >
              <div className="p-4 h-full">
                <TradeTicket />
              </div>
            </div>

            <div
              key="positions"
              className="bg-gray-900 dark:bg-gray-900 rounded-lg shadow-md border border-gray-700 dark:border-gray-700"
            >
              <div className="p-4 h-full">
                <PositionsWidget />
              </div>
            </div>
          </ResponsiveGridLayout>
        </div>

        {/* Not lg screen: use normal layout */}
        <div className="lg:hidden grid grid-cols-1 gap-4 h-[calc(100vh-8rem)]">
          <div className="h-20">
            <InstrumentSelector />
          </div>
          <div className="flex-1 min-h-0">
            <TradingViewChart />
          </div>
          <div className="h-80">
            <OrderBook />
          </div>
          <div className="h-80">
            <TradeTicket />
          </div>
          <div className="flex-1 min-h-0">
            <PositionsWidget />
          </div>
        </div>
      </div>
    </div>
  )
}

export default TradingLayout
