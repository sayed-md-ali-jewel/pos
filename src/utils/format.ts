/**
 * Format numbers using Indian numbering system (lakhs, crores)
 * @param value - The number to format
 * @param currency - Whether to include currency symbol (৳)
 * @returns Formatted string
 */
export function formatNumber(value: number | string | undefined | null, currency = false): string {
  if (value === null || value === undefined) return '—';

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';

  const formatted = num.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });

  return currency ? `৳${formatted}` : formatted;
}

/**
 * Format currency values with Indian numbering system
 * @param value - The number to format
 * @returns Formatted currency string
 */
export function formatCurrency(value: number | string | undefined | null): string {
  return formatNumber(value, true);
}

/**
 * Format percentage values
 * @param value - The number to format
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number | string | undefined | null, decimals = 1): string {
  if (value === null || value === undefined) return '—';

  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '—';

  return `${num.toFixed(decimals)}%`;
}
