export const DEFAULT_CHART_OPTION = {
  backgroundColor: '#171717',
  grid: { left: 0, right: 0, top: 30, bottom: 30 },
  xAxis: {
    type: 'value',
    axisLine: { show: false },
    splitLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      showMinLabel: false,
      showMaxLabel: false,
      color: '#aaa'
    }
  },
  yAxis: {
    type: 'value',
    axisLine: { show: false },
    axisLabel: { color: '#aaa', inside: true },
    axisTick: { show: false },
    splitLine: { show: false },
    position: 'right',
    scale: true
  },
  series: [
    {
      name: 'Bids',
      type: 'line',
      step: 'end',
      showSymbol: false,
      lineStyle: { color: '#00C087', width: 2 },
      areaStyle: {
        color: 'rgba(0,192,135,0.3)'
      },
      data: []
    },
    {
      name: 'Asks',
      type: 'line',
      step: 'end',
      showSymbol: false,
      lineStyle: { color: '#F6465D', width: 2 },
      areaStyle: {
        color: 'rgba(246,70,93,0.3)'
      },
      data: []
    }
  ]
}
