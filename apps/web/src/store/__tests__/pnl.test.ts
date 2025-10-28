import { createStore } from 'jotai'
import { describe, expect, it } from 'vitest'
import { pnlAtom, positionsAtom } from '../pnl'

describe('pnl store', () => {
  describe('pnlAtom', () => {
    it('should be defined', () => {
      expect(pnlAtom).toBeDefined()
    })

    it('should be a writable atom', () => {
      expect(pnlAtom.write).toBeDefined()
    })

    it('should have read function', () => {
      expect(pnlAtom.read).toBeDefined()
    })
  })

  describe('positionsAtom', () => {
    it('should be defined', () => {
      expect(positionsAtom).toBeDefined()
    })

    it('should be a derived atom', () => {
      expect(positionsAtom.read).toBeDefined()
    })

    it('should derive positions from pnl atom', () => {
      const store = createStore()
      const result = store.get(positionsAtom)
      expect(result).toEqual([])
    })
  })
})
