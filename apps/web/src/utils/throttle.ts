/**
 * Throttle utility functions
 * These are pure functions that don't need React hooks
 */

/**
 * Throttle function calls to limit execution frequency
 * @param func - The function to throttle
 * @param delay - The delay in milliseconds
 * @returns Throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  let timeoutId: number | null = null
  let lastCallTime = 0

  return ((...args: Parameters<T>) => {
    const now = Date.now()
    const timeSinceLastCall = now - lastCallTime

    // Clear previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }

    // If enough time has passed or this is the first call, execute immediately
    if (timeSinceLastCall >= delay || lastCallTime === 0) {
      lastCallTime = now
      func(...args)
    } else {
      // Otherwise, schedule execution
      const remainingDelay = delay - timeSinceLastCall
      timeoutId = setTimeout(() => {
        lastCallTime = Date.now()
        func(...args)
      }, remainingDelay)
    }
  }) as T
}
