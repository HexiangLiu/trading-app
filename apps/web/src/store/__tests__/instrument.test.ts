import { createStore } from 'jotai'
import { describe, expect, it } from 'vitest'
import { Exchange, InstrumentName } from '@/types/instrument'
import {
  DEFAULT_INSTRUMENT,
  instrumentAtom,
  instrumentExchangeAtom,
  instrumentNameAtom
} from '../instrument'

describe('instrument store', () => {
  describe('DEFAULT_INSTRUMENT', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_INSTRUMENT.name).toBe(InstrumentName.BTCUSDT)
      expect(DEFAULT_INSTRUMENT.exchange).toBe(Exchange.BINANCE)
    })

    it('should be an object with name and exchange properties', () => {
      expect(DEFAULT_INSTRUMENT).toHaveProperty('name')
      expect(DEFAULT_INSTRUMENT).toHaveProperty('exchange')
    })
  })

  describe('instrumentAtom', () => {
    it('should be defined', () => {
      expect(instrumentAtom).toBeDefined()
    })

    it('should have init property equal to DEFAULT_INSTRUMENT', () => {
      expect(instrumentAtom.init).toEqual(DEFAULT_INSTRUMENT)
    })
  })

  describe('instrumentNameAtom', () => {
    it('should be defined', () => {
      expect(instrumentNameAtom).toBeDefined()
    })

    it('should be a derived atom', () => {
      expect(instrumentNameAtom.read).toBeDefined()
    })

    it('should derive instrument name from instrument atom', () => {
      const store = createStore()
      const result = store.get(instrumentNameAtom)
      expect(result).toBe(InstrumentName.BTCUSDT)
    })
  })

  describe('instrumentExchangeAtom', () => {
    it('should be defined', () => {
      expect(instrumentExchangeAtom).toBeDefined()
    })

    it('should be a derived atom', () => {
      expect(instrumentExchangeAtom.read).toBeDefined()
    })

    it('should derive instrument exchange from instrument atom', () => {
      const store = createStore()
      const result = store.get(instrumentExchangeAtom)
      expect(result).toBe(Exchange.BINANCE)
    })
  })
})
