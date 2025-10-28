/**
 * Instrument Store
 * Manages the currently selected instrument state
 */

import { atom } from 'jotai'
import { Exchange, type Instrument, InstrumentName } from '@/types/instrument'

// Default instrument
export const DEFAULT_INSTRUMENT: Instrument = {
  name: InstrumentName.BTCUSDT,
  exchange: Exchange.BINANCE,
}

// Instrument atom
export const instrumentAtom = atom<Instrument>(DEFAULT_INSTRUMENT)

// Derived atoms for convenience
export const instrumentNameAtom = atom(get => get(instrumentAtom).name)

export const instrumentExchangeAtom = atom(get => get(instrumentAtom).exchange)
