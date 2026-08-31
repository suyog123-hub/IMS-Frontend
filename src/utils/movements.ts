import type { MovementType } from '../types/models'

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  'transfer-in': 'Transfer In',
  'transfer-out': 'Transfer Out',
  inbound: 'Inbound',
  sale: 'Sold',
  'return-in': 'Return',
}

export function movementLabel(type: string): string {
  return MOVEMENT_LABELS[type as MovementType] ?? 'Transfer'
}