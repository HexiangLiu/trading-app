/**
 * 布林带 + RSI 买卖信号指标
 * 买入信号：价格触及布林带下轨 && RSI < 30（超卖）
 * 卖出信号：价格触及布林带上轨 && RSI > 70（超买）
 */

export const createBBRsiSignalsIndicator = (PineJS: any) => {
  return {
    name: 'BB+RSI 买卖信号',
    metainfo: {
      _metainfoVersion: 53,
      id: 'BBRsiSignals@tv-basicstudies-1',
      description: '布林带+RSI买卖信号指标',
      shortDescription: 'BB+RSI信号',
      format: { type: 'inherit' },
      linkedToSeries: true,
      is_price_study: true,
      plots: [
        { id: 'upper', type: 'line' },
        { id: 'middle', type: 'line' },
        { id: 'lower', type: 'line' },
        { id: 'buy_signal', type: 'chars' },
        { id: 'sell_signal', type: 'chars' }
      ],
      filledAreas: [
        {
          id: 'bb_band',
          objAId: 'upper',
          objBId: 'lower',
          type: 'plot_plot',
          title: 'Bollinger Bands'
        }
      ],
      defaults: {
        styles: {
          upper: {
            linestyle: 0,
            linewidth: 2,
            plottype: 0,
            trackPrice: false,
            transparency: 0,
            visible: true,
            color: '#F23645'
          },
          middle: {
            linestyle: 0,
            linewidth: 2,
            plottype: 0,
            trackPrice: false,
            transparency: 0,
            visible: true,
            color: '#2196F3'
          },
          lower: {
            linestyle: 0,
            linewidth: 2,
            plottype: 0,
            trackPrice: false,
            transparency: 0,
            visible: true,
            color: '#089981'
          },
          buy_signal: {
            location: 'BelowBar',
            plottype: 2, // chars
            char: '▲',
            textColor: '#089981',
            color: '#089981',
            transparency: 0,
            visible: true,
            size: 'huge'
          },
          sell_signal: {
            location: 'AboveBar',
            plottype: 2, // chars
            char: '▼',
            textColor: '#F23645',
            color: '#F23645',
            transparency: 0,
            visible: true,
            size: 'huge'
          }
        },
        filledAreasStyle: {
          bb_band: {
            color: '#2196F3',
            transparency: 90,
            visible: true
          }
        },
        inputs: {
          bb_length: 20,
          bb_mult: 2,
          rsi_length: 14,
          rsi_oversold: 30,
          rsi_overbought: 70,
          source: 'close'
        }
      },
      styles: {
        upper: { title: '布林上轨', histogramBase: 0, joinPoints: true },
        middle: { title: '布林中轨', histogramBase: 0, joinPoints: true },
        lower: { title: '布林下轨', histogramBase: 0, joinPoints: true },
        buy_signal: { title: '买入信号', isHidden: false },
        sell_signal: { title: '卖出信号', isHidden: false }
      },
      inputs: [
        {
          id: 'bb_length',
          name: '布林带周期',
          defval: 20,
          type: 'integer',
          min: 1,
          max: 500
        },
        {
          id: 'bb_mult',
          name: '布林带倍数',
          defval: 2,
          type: 'float',
          min: 0.1,
          max: 10,
          step: 0.1
        },
        {
          id: 'rsi_length',
          name: 'RSI周期',
          defval: 14,
          type: 'integer',
          min: 1,
          max: 500
        },
        {
          id: 'rsi_oversold',
          name: 'RSI超卖线',
          defval: 30,
          type: 'integer',
          min: 1,
          max: 99
        },
        {
          id: 'rsi_overbought',
          name: 'RSI超买线',
          defval: 70,
          type: 'integer',
          min: 1,
          max: 99
        },
        {
          id: 'source',
          name: '数据源',
          defval: 'close',
          type: 'source',
          options: ['open', 'high', 'low', 'close', 'hl2', 'hlc3', 'ohlc4']
        }
      ]
    },
    constructor: function () {
      // @ts-expect-error - TradingView custom indicator pattern
      this.main = function (ctx: any, inputs: any) {
        // @ts-expect-error
        this._context = ctx
        // @ts-expect-error
        this._input = inputs

        // 获取输入参数
        // @ts-expect-error
        const bb_length = this._input(0)
        // @ts-expect-error
        const bb_mult = this._input(1)
        // @ts-expect-error
        const rsi_length = this._input(2)
        // @ts-expect-error
        const rsi_oversold = this._input(3)
        // @ts-expect-error
        const rsi_overbought = this._input(4)
        // @ts-expect-error
        const source = PineJS.Std[this._input(5)](this._context)

        // 设置最小数据深度
        // @ts-expect-error
        this._context.setMinimumAdditionalDepth(
          Math.max(bb_length, rsi_length) + 10
        )

        // === 计算布林带 ===
        // @ts-expect-error
        const series = this._context.new_var(source)
        // @ts-expect-error
        const basis = PineJS.Std.sma(series, bb_length, this._context)

        // 计算标准差
        // @ts-expect-error
        const dev = PineJS.Std.stdev(series, bb_length, this._context)
        const mult_dev = dev * bb_mult

        const upper = basis + mult_dev
        const lower = basis - mult_dev

        // === 计算 RSI ===
        // @ts-expect-error
        const rsi = PineJS.Std.rsi(series, rsi_length, this._context)

        // === 计算买卖信号 ===
        // @ts-expect-error
        const close = PineJS.Std.close(this._context)

        // 买入信号：价格触及或跌破布林下轨 && RSI < 超卖线
        const touch_lower = close <= lower
        const is_oversold = rsi < rsi_oversold
        const buy_signal = touch_lower && is_oversold ? close : NaN

        // 卖出信号：价格触及或突破布林上轨 && RSI > 超买线
        const touch_upper = close >= upper
        const is_overbought = rsi > rsi_overbought
        const sell_signal = touch_upper && is_overbought ? close : NaN

        return [
          { value: upper, offset: 0 },
          { value: basis, offset: 0 },
          { value: lower, offset: 0 },
          { value: buy_signal, offset: 0 },
          { value: sell_signal, offset: 0 }
        ]
      }
    }
  }
}
