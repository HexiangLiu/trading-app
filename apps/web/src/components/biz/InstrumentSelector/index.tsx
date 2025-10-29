import { useAtom } from 'jotai'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/basic/dropdown'
import { ChartTab, chartTabAtom } from '@/store/chart'
import { instrumentAtom } from '@/store/instrument'
import { darkModeAtom } from '@/store/theme'
import { Exchange, type Instrument, InstrumentName } from '@/types/instrument'
import { cn } from '@/utils/classMerge'

const INSTRUMENTS: Instrument[] = [
  { name: InstrumentName.BTCUSDT, exchange: Exchange.BINANCE },
  { name: InstrumentName.ETHUSDT, exchange: Exchange.BINANCE },
  { name: InstrumentName.SOLUSDT, exchange: Exchange.BINANCE }
]

export const InstrumentSelector = () => {
  const [instrument, setInstrument] = useAtom(instrumentAtom)
  const [chartTab, setChartTab] = useAtom(chartTabAtom)
  const handleSelect = (instrument: Instrument) => {
    setInstrument(instrument)
  }

  const [isDarkMode] = useAtom(darkModeAtom)

  return (
    <div className="flex items-center gap-2 justify-between w-full p-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="outline-none flex gap-1 items-center justify-between px-3 py-2 rounded-md text-gray-900 dark:text-white transition-colors cursor-pointer select-none">
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1 font-medium">
                {instrument.name.toUpperCase()}
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
              <span className="text-xs text-gray-400">
                {instrument.exchange.toUpperCase()}
              </span>
            </div>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="start"
          className={cn(
            'w-60 bg-neutral-100! dark:bg-neutral-900! border-gray-200! dark:border-gray-700!',
            isDarkMode ? 'dark' : ''
          )}
        >
          {INSTRUMENTS.map(instrument => (
            <DropdownMenuItem
              key={`${instrument.exchange}-${instrument.name}`}
              onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                e.stopPropagation()
                handleSelect(instrument)
              }}
              className="flex flex-col items-start p-3 cursor-pointer bg-gray-100! dark:bg-neutral-900! hover:bg-gray-300! dark:hover:bg-gray-700! transition-colors text-gray-900! dark:text-white! select-none"
            >
              <span className="font-medium text-gray-900 dark:text-white">
                {instrument.name.toUpperCase()}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {instrument.exchange.toUpperCase()}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setChartTab(ChartTab.CHART)}
          className={cn(
            'text-sm cursor-pointer px-2 py-1 rounded transition-colors hover:text-gray-900 dark:hover:text-white text-gray-600 dark:text-gray-400',
            chartTab === ChartTab.CHART ? ' text-gray-900 dark:text-white' : ''
          )}
        >
          Chart
        </button>
        <button
          onClick={() => setChartTab(ChartTab.DEPTH)}
          className={cn(
            'text-sm cursor-pointer px-2 py-1 rounded transition-colors hover:text-gray-900 dark:hover:text-white text-gray-600 dark:text-gray-400',
            chartTab === ChartTab.DEPTH ? 'text-gray-900 dark:text-white' : ''
          )}
        >
          Depth
        </button>
      </div>
    </div>
  )
}
