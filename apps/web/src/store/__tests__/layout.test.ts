import { describe, expect, it } from 'vitest'
import { layoutAtom } from '../layout'

describe('layout store', () => {
  describe('layoutAtom', () => {
    it('should be defined', () => {
      expect(layoutAtom).toBeDefined()
    })

    it('should be a writable atom', () => {
      expect(layoutAtom.write).toBeDefined()
    })

    it('should have read function', () => {
      expect(layoutAtom.read).toBeDefined()
    })
  })
})
