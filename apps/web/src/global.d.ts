/**
 * Global type declarations for the trading app
 */

declare global {
  interface Window {
    __binanceAdapter?: import('./adapters/Binance').BinanceAdapter
    __exchangeAdapterManager?: import('./adapters').ExchangeAdapterManager
  }
}

export {}
