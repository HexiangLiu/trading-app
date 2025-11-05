import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import type { PnLData, Position } from '@/workers/tradeAggregator'

export const pnlAtom = atomWithStorage<PnLData>('trading-app-pnl', {
  positions: [],
  totalUnrealizedPnL: 0
})

export const positionsAtom = atom<Position[]>(get => get(pnlAtom).positions)
