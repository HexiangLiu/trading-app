import { atomWithStorage } from 'jotai/utils'
import type { Layouts } from 'react-grid-layout'

export const layoutAtom = atomWithStorage<Layouts>('layout', {
  md: [
    { i: 'instrument', x: 0, y: 0, w: 6, h: 1, minW: 3, maxW: 12 },
    { i: 'chart', x: 0, y: 1, w: 6, h: 7, minW: 3, minH: 4, maxW: 12 },
    { i: 'orderbook', x: 6, y: 0, w: 3, h: 8, minW: 3, minH: 6, maxW: 12 },
    { i: 'ticket', x: 9, y: 0, w: 3, h: 8, minW: 3, minH: 2, maxW: 12 },
    { i: 'positions', x: 0, y: 8, w: 12, h: 8, minW: 3, minH: 3, maxW: 12 }
  ],
  sm: [
    { i: 'instrument', x: 0, y: 0, w: 12, h: 1, minW: 12, maxW: 12 },
    { i: 'chart', x: 0, y: 1, w: 12, h: 6, minW: 12, maxW: 12 },
    { i: 'orderbook', x: 0, y: 7, w: 6, h: 6, minW: 6, maxW: 6 },
    { i: 'ticket', x: 6, y: 7, w: 6, h: 6, minW: 6, maxW: 6 },
    { i: 'positions', x: 0, y: 13, w: 12, h: 5, minW: 12, maxW: 12 }
  ],
  xs: [
    { i: 'instrument', x: 0, y: 0, w: 12, h: 1, minW: 12, maxW: 12 },
    { i: 'chart', x: 0, y: 1, w: 12, h: 6, minW: 12, maxW: 12 },
    { i: 'orderbook', x: 0, y: 7, w: 6, h: 6, minW: 6, maxW: 6 },
    { i: 'ticket', x: 6, y: 7, w: 6, h: 6, minW: 6, maxW: 6 },
    { i: 'positions', x: 0, y: 13, w: 12, h: 5, minW: 12, maxW: 12 }
  ],
  xxs: [
    { i: 'instrument', x: 0, y: 0, w: 12, h: 1, minW: 12, maxW: 12 },
    { i: 'chart', x: 0, y: 1, w: 12, h: 6, minW: 12, maxW: 12 },
    { i: 'orderbook', x: 0, y: 7, w: 6, h: 6, minW: 6, maxW: 6 },
    { i: 'ticket', x: 6, y: 7, w: 6, h: 6, minW: 6, maxW: 6 },
    { i: 'positions', x: 0, y: 13, w: 12, h: 5, minW: 12, maxW: 12 }
  ]
})
