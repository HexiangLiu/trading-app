import { describe, expect, it } from 'vitest'
import { darkModeAtom } from '../theme'

describe('theme store', () => {
  describe('darkModeAtom', () => {
    it('should be defined', () => {
      expect(darkModeAtom).toBeDefined()
    })

    it('should be a writable atom', () => {
      expect(darkModeAtom.write).toBeDefined()
    })

    it('should have read function', () => {
      expect(darkModeAtom.read).toBeDefined()
    })
  })
})
