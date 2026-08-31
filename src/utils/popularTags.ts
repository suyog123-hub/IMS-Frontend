export interface PopularTag {
  id: 'onsale' | 'instock' | 'lowstock' | 'outofstock'
  label: string
  color: string
}

export const POPULAR_TAGS: PopularTag[] = [
  { id: 'onsale', label: 'On Sale', color: '#f43f5e' },
  { id: 'instock', label: 'In Stock', color: '#10b981' },
  { id: 'lowstock', label: 'Low Stock', color: '#f59e0b' },
  { id: 'outofstock', label: 'Out of Stock', color: '#ef4444' },
]