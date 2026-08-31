import type { LocationChannel, StockLocation } from '../types/models'

export const CHANNEL_OPTIONS: ReadonlyArray<{ value: LocationChannel; label: string }> = [
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'store', label: 'Storefront (Offline)' },
  { value: 'popup', label: 'Pop-up store' },
  { value: 'online', label: 'Online (Shopee / LINE)' },
]

export const CHANNEL_LABELS: Record<LocationChannel, string> = {
  warehouse: 'Warehouse',
  store: 'Storefront',
  popup: 'Pop-up',
  online: 'Online',
}

export const CHANNEL_COLORS: Record<LocationChannel, string> = {
  warehouse: '#64748b',
  store: '#6366f1',
  popup: '#f59e0b',
  online: '#10b981',
}

export function locationChannel(location: StockLocation): LocationChannel {
  return location.channel ?? 'warehouse'
}