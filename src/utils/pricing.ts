export function calculateSellingPrice(costPrice: number, discountPercent: number): number {
  return Math.round(costPrice * (1 - discountPercent / 100) * 100) / 100
}