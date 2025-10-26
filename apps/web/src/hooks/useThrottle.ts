import { useCallback, useRef } from 'react'

/**
 * Custom hook for throttling function calls
 * @param callback - The function to throttle
 * @param delay - The delay in milliseconds
 * @returns Throttled function
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<number | null>(null)
  const lastCallTimeRef = useRef<number>(0)

  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now()
      const timeSinceLastCall = now - lastCallTimeRef.current

      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }

      // If enough time has passed or this is the first call, execute immediately
      if (timeSinceLastCall >= delay || lastCallTimeRef.current === 0) {
        lastCallTimeRef.current = now
        callback(...args)
      } else {
        // Otherwise, schedule execution
        const remainingDelay = delay - timeSinceLastCall
        timeoutRef.current = setTimeout(() => {
          lastCallTimeRef.current = Date.now()
          callback(...args)
        }, remainingDelay)
      }
    },
    [callback, delay]
  ) as T

  return throttledCallback
}

/**
 * Custom hook for debouncing function calls
 * @param callback - The function to debounce
 * @param delay - The delay in milliseconds
 * @returns Debounced function
 */
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<number | null>(null)

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay]
  ) as T

  return debouncedCallback
}
