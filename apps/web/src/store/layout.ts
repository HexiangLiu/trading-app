import { atomWithStorage } from 'jotai/utils'
import type { Layouts } from 'react-grid-layout'

export const layoutAtom = atomWithStorage<Layouts>('layout', {
  lg: [
    { i: 'instrument', x: 0, y: 0, w: 8, h: 1, minW: 3, maxW: 6 },
    { i: 'chart', x: 0, y: 1, w: 8, h: 7, minW: 3, maxW: 6, minH: 4 },
    { i: 'orderbook', x: 8, y: 0, w: 2, h: 8, minW: 3, maxW: 6, minH: 6 },
    { i: 'ticket', x: 10, y: 0, w: 2, h: 8, minW: 3, maxW: 6, minH: 2 },
    { i: 'positions', x: 0, y: 8, w: 12, h: 5, minW: 3, maxW: 6, minH: 3 },
  ],
})
