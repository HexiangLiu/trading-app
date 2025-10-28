import { describe, expect, it } from 'vitest'
import { orderAtom } from '../order'

describe('order store', () => {
  describe('orderAtom', () => {
    it('should be defined', () => {
      expect(orderAtom).toBeDefined()
    })

    it('should be a writable atom', () => {
      expect(orderAtom.write).toBeDefined()
    })

    it('should have read function', () => {
      expect(orderAtom.read).toBeDefined()
    })
  })
})
