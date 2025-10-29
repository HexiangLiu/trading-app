import { atom } from 'jotai'

export enum ChartTab {
  CHART = 'chart',
  DEPTH = 'depth'
}

export const chartTabAtom = atom<ChartTab>(ChartTab.CHART)
