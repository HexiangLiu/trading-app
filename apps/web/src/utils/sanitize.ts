/**
 * Sanitise user input to prevent XSS / HTML injection
 * - Removes HTML tags
 * - Escapes special characters
 * - Trims whitespace
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return ''

  // 1. Remove HTML tags and their content
  // First pass: remove script, style, and other dangerous tags with their content
  let stripped = input
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*>[\s\S]*?<\/embed>/gi, '')

  // Second pass: remove all remaining HTML tags
  while (stripped !== stripped.replace(/<[^<>]*>/g, '')) {
    stripped = stripped.replace(/<[^<>]*>/g, '')
  }

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
