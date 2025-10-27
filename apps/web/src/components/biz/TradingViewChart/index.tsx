import { useAtom } from 'jotai'
import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { exchangeAdapterManager } from '@/adapters'
import {
  type IChartingLibraryWidget,
  type ResolutionString,
  widget
} from '@/charting_library'
import { DEFAULT_INSTRUMENT, instrumentAtom } from '@/store/instrument'
import type { Instrument } from '@/types/instrument'
import { Datafeed } from './datafeed'

const datafeed = new Datafeed()

export const TradingViewChart = memo(() => {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<IChartingLibraryWidget>(null)
  const prevInstrumentRef = useRef<Instrument>(DEFAULT_INSTRUMENT)
  const currentIntervalRef = useRef<string>('4h')
  const [instrument] = useAtom(instrumentAtom)
  const [chartLoaded, setChartLoaded] = useState<boolean>(false)

  const handleSwitchInstrument = useCallback(async (instrument: Instrument) => {
    if (prevInstrumentRef.current === instrument) return

    const oldInstrument = prevInstrumentRef.current
    prevInstrumentRef.current = instrument

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
    widgetRef.current
      ?.chart()
      .setSymbol(`${instrument.exchange}:${instrument.name.toUpperCase()}`)
  }, [])

  useEffect(() => {
    handleSwitchInstrument(instrument)
  }, [instrument, handleSwitchInstrument])

  useEffect(() => {
    if (chartLoaded) {
      widgetRef.current
        ?.chart()
        .onIntervalChanged()
        .subscribe(null, interval => {
          // Unsubscribe from current kline stream
          currentIntervalRef.current = interval
          exchangeAdapterManager.unsubscribe(
            instrument.exchange,
            instrument.name,
            'kline',
            interval
          )
        })
    }
  }, [chartLoaded, instrument])

  useEffect(() => {
    if (!chartContainerRef.current) return

    try {
      const tvWidget = new widget({
        container: chartContainerRef.current,
        interval: '4h' as ResolutionString,
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
        ]
      })
      widgetRef.current = tvWidget

      // Listen for chart ready event
      tvWidget.onChartReady(() => {
        setChartLoaded(true)
        const chart = tvWidget.chart()
        chart.createStudy('Moving Average Exponential', false, false, {
          length: 9
        })
      })

      return () => {
        tvWidget.remove()
      }
    } catch (error) {
      console.error('Failed to initialize TradingView chart:', error)
      return undefined
    }
  }, [])

  return <div ref={chartContainerRef} className="w-full h-full" />
})
