import { useAtom, useAtomValue } from 'jotai'
import {
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState
} from 'react'
import { exchangeAdapterManager } from '@/adapters'
import {
  type CustomIndicator,
  type IChartingLibraryWidget,
  type ResolutionString,
  widget
} from '@/charting_library'
import { ChartTab, chartTabAtom } from '@/store/chart'
import { DEFAULT_INSTRUMENT, instrumentAtom } from '@/store/instrument'
import type { Instrument } from '@/types/instrument'
import { cn } from '@/utils/classMerge'
import { createBBRsiSignalsIndicator } from './bbRsiSignals'
import { ChartSkeleton } from './ChartSkeleton'
import { Datafeed } from './datafeed'

const DepthChart = lazy(() =>
  import('./DepthChart').then(module => ({ default: module.DepthChart }))
)

const datafeed = new Datafeed()

export const TradingViewChart = memo(() => {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<IChartingLibraryWidget>(null)
  const currentInstrumentRef = useRef<Instrument>(DEFAULT_INSTRUMENT)
  const currentIntervalRef = useRef<string>('240')
  const [instrument] = useAtom(instrumentAtom)
  const [chartLoaded, setChartLoaded] = useState<boolean>(false)
  const chartTab = useAtomValue(chartTabAtom)

  const handleSwitchInstrument = useCallback(async (instrument: Instrument) => {
    if (currentInstrumentRef.current === instrument) return

    const oldInstrument = currentInstrumentRef.current
    currentInstrumentRef.current = instrument

    // Unsubscribe from old instrument kline streams only
    if (oldInstrument) {
      // Only unsubscribe kline streams, other components might still need depth/trade streams
      exchangeAdapterManager.unsubscribe(
        oldInstrument.exchange,
        oldInstrument.name,
        'kline',
        currentIntervalRef.current
      )
    }
    console.log('Switch instrument:', instrument)
    widgetRef.current
      ?.chart()
      .setSymbol(`${instrument.exchange}:${instrument.name.toUpperCase()}`)
  }, [])

  useEffect(() => {
    handleSwitchInstrument(instrument)
  }, [instrument, handleSwitchInstrument])

  useEffect(() => {
    if (!chartContainerRef.current) return

    try {
      const tvWidget = new widget({
        container: chartContainerRef.current,
        interval: '240' as ResolutionString,
        datafeed,
        locale: 'en',
        library_path: '/charting_library/',
        symbol: 'Binance:BTCUSDT',
        theme: 'dark',
        autosize: true,
        toolbar_bg: '#1e222d',
        loading_screen: { backgroundColor: '#1e222d' },
        disabled_features: [
          'header_symbol_search',
          'header_compare',
          'header_chart_type',
          'timeframes_toolbar'
        ],
        custom_indicators_getter: PineJS =>
          Promise.resolve<readonly CustomIndicator[]>([
            createBBRsiSignalsIndicator(PineJS) as unknown as CustomIndicator
          ])
      })

      // Reset current instrument and interval for HMR
      currentInstrumentRef.current = DEFAULT_INSTRUMENT
      currentIntervalRef.current = '240'
      widgetRef.current = tvWidget

      // Listen for chart ready event
      tvWidget.onChartReady(() => {
        setChartLoaded(true)
        const chart = tvWidget.chart()
        chart.onIntervalChanged().subscribe(null, interval => {
          console.log('onIntervalChanged', interval, currentIntervalRef.current)
          exchangeAdapterManager.unsubscribe(
            currentInstrumentRef.current.exchange,
            currentInstrumentRef.current.name,
            'kline',
            currentIntervalRef.current
          )
          currentIntervalRef.current = interval
        })
        chart.createStudy('Moving Average Exponential', false, false, {
          length: 9
        })
      })

      return () => {
        // Unsubscribe from current kline stream before removing widgets
        if (currentInstrumentRef.current) {
          exchangeAdapterManager.unsubscribe(
            currentInstrumentRef.current.exchange,
            currentInstrumentRef.current.name,
            'kline',
            currentIntervalRef.current
          )
        }
        tvWidget.remove()
        setChartLoaded(false)
        widgetRef.current = null
      }
    } catch (error) {
      console.error('Failed to initialize TradingView chart:', error)
      return undefined
    }
  }, [])

  return (
    <>
      {!chartLoaded && <ChartSkeleton />}
      <div
        ref={chartContainerRef}
        className={cn('w-full h-full block', {
          hidden: !chartLoaded || chartTab === ChartTab.DEPTH
        })}
      />
      {chartTab === ChartTab.DEPTH && (
        <Suspense fallback={<ChartSkeleton />}>
          <DepthChart />
        </Suspense>
      )}
    </>
  )
})
