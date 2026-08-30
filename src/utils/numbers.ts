export function toNumber(value: string): number | null {
  if (value.trim() === '') return 0
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}