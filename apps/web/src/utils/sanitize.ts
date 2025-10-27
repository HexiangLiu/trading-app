/**
 * Sanitise user input to prevent XSS / HTML injection
 * - Removes HTML tags
 * - Escapes special characters
 * - Trims whitespace
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return ''

  // 1. Remove HTML tags
  const stripped = input.replace(/<[^>]*>/g, '')

  // 2. Escape special characters
  const escaped = stripped
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  // 3. Trim whitespace
  return escaped.trim()
}
