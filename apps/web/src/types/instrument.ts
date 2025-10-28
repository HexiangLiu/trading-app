/**
 * Instrument name enumeration
 */
export enum InstrumentName {
  BTCUSDT = 'btcusdt',
  ETHUSDT = 'ethusdt',
  SOLUSDT = 'solusdt',
}

/**
 * Exchange enumeration
 */
export enum Exchange {
  BINANCE = 'binance',
}

/**
 * Instrument interface
 */
export interface Instrument {
  name: InstrumentName
  exchange: Exchange
}
