import * as echarts from 'echarts'
import { useAtomValue } from 'jotai'
import { memo, useEffect, useRef } from 'react'
import { instrumentAtom } from '@/store/instrument'
import { DEFAULT_CHART_OPTION } from './echartOption'

export const DepthChart = memo(() => {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts>(null)
  const instrument = useAtomValue(instrumentAtom)

  useEffect(() => {
    if (!ref.current) return
    chartRef.current = echarts.init(ref.current)
    chartRef.current.setOption(DEFAULT_CHART_OPTION)
    const resizeObserver = new ResizeObserver(() => {
      chartRef.current?.resize()
    })
    resizeObserver.observe(ref.current)
    return () => {
      resizeObserver.disconnect()
      chartRef.current?.dispose()
    }
  }, [])

  useEffect(() => {
    let timer: number | null = null
    let cancelled = false
    const baseDelayMs = 10000

    const fetchAndRender = async (): Promise<number> => {
      try {
        const symbol = (instrument?.name || '').toUpperCase()
        if (!symbol) return baseDelayMs

        const params = new URLSearchParams({ symbol, limit: '5000' })
        const resp = await fetch(
          `https://data-api.binance.vision/api/v3/depth?${params}`
        )
        // Handle rate limit 429 with Retry-After header
        if (resp.status === 429) {
          const retryAfterHeader = resp.headers.get('Retry-After')
          const retrySec = retryAfterHeader ? Number(retryAfterHeader) : NaN
          const retryMs =
            Number.isFinite(retrySec) && retrySec > 0 ? retrySec * 1000 : 2000
          return retryMs
        }
        if (!resp.ok) return baseDelayMs
        const json = await resp.json()
        const bidsRaw: [string, string][] = json.bids || []
        const asksRaw: [string, string][] = json.asks || []

        const bids = bidsRaw
          .map(([p, q]) => ({ price: Number(p), quantity: Number(q) }))
          .filter(x => x.quantity > 0)
          .sort((a, b) => b.price - a.price)
        const asks = asksRaw
          .map(([p, q]) => ({ price: Number(p), quantity: Number(q) }))
          .filter(x => x.quantity > 0)
          .sort((a, b) => a.price - b.price)

        if (bids.length === 0 || asks.length === 0) return baseDelayMs

        // Cumulative
        const cumBid: number[] = []
        const cumAsk: number[] = []
        let s = 0
        for (const x of bids) {
          s += x.quantity
          cumBid.push(s)
        }
        s = 0
        for (const x of asks) {
          s += x.quantity
          cumAsk.push(s)
        }

        const bidSeries = bids.map((b, i) => [b.price, cumBid[i]])
        const askSeries = asks.map((a, i) => [a.price, cumAsk[i]])

        if (!cancelled && chartRef.current) {
          chartRef.current.setOption({
            xAxis: {
              ...DEFAULT_CHART_OPTION.xAxis,
              min: bidSeries[bidSeries.length - 1][0],
              max: askSeries[askSeries.length - 1][0]
            },
            series: [{ data: bidSeries }, { data: askSeries }]
          })
        }
        return baseDelayMs
      } catch {
        // silent
        return baseDelayMs
      }
    }

    // self-adjust loop using setTimeout to support dynamic backoff
    const loop = async () => {
      const nextDelay = await fetchAndRender()
      if (!cancelled) {
        timer = window.setTimeout(
          loop,
          typeof nextDelay === 'number' ? nextDelay : baseDelayMs
        )
      }
    }
    loop()

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [instrument])
  return (
    <div className="w-full h-full p-1">
      <div ref={ref} className="w-full h-full" />
    </div>
  )
})
