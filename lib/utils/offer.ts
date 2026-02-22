/**
 * Format offer number as YYYY-0000
 * @param offerNumber - The numeric offer number
 * @param year - The year (defaults to current year if not provided)
 * @returns Formatted offer number string, e.g. "2026-0018"
 */
export function formatOfferNumber(offerNumber: number | null | undefined, year?: number): string {
  if (!offerNumber) return 'N/A'
  
  const displayYear = year || new Date().getFullYear()
  const paddedNumber = String(offerNumber).padStart(4, '0')
  
  return `${displayYear}-${paddedNumber}`
}
