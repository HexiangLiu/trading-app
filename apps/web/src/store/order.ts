import { atomWithStorage } from 'jotai/utils'
import type { Order } from '@/types/order'

export const orderAtom = atomWithStorage<Order[]>('orders', [])
