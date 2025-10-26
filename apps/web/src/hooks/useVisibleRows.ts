import { useCallback, useEffect, useRef, useState } from 'react'

interface UseVisibleRowsOptions {
  rowHeight: number
}

interface UseVisibleRowsReturn {
  containerRef: (node: HTMLDivElement | null) => void
  totalVisibleRows: number
}

export const useVisibleRows = ({
  rowHeight,
}: UseVisibleRowsOptions): UseVisibleRowsReturn => {
  const [totalVisibleRows, setTotalVisibleRows] = useState(0)
  const [element, setElement] = useState<HTMLDivElement | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)

  const calculateVisibleRows = useCallback(
    (element: HTMLDivElement) => {
      const clientHeight = element.clientHeight
      const visibleRows = Math.floor(clientHeight / rowHeight)
      setTotalVisibleRows(visibleRows)
    },
    [rowHeight]
  )

  // Ref callback only handles initialization
  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      setElement(node)
      if (node) {
        // Calculate initial visible rows
        calculateVisibleRows(node)
      }
    },
    [calculateVisibleRows]
  )

  // Handle event listeners in useEffect
  useEffect(() => {
    if (!element) return

    const handleLayoutResize = () => {
      calculateVisibleRows(element)
    }

    document.addEventListener('gridlayoutresize', handleLayoutResize)

    // Cleanup function
    return () => {
      document.removeEventListener('gridlayoutresize', handleLayoutResize)
    }
  }, [element, calculateVisibleRows])

  // Handle ResizeObserver in useEffect
  useEffect(() => {
    if (!element) return

    // Set up ResizeObserver
    const resizeObserver = new ResizeObserver(() => {
      calculateVisibleRows(element)
    })

    resizeObserver.observe(element)
    resizeObserverRef.current = resizeObserver

    // Cleanup function
    return () => {
      resizeObserver.disconnect()
    }
  }, [element, calculateVisibleRows])

  return {
    containerRef,
    totalVisibleRows,
  }
}
