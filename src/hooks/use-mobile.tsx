import { useState, useEffect } from 'react';

/**
 * Hook to detect if the current viewport is a mobile device
 * @param breakpoint The maximum width in pixels to consider as mobile (default: 768px)
 * @returns Boolean indicating if the current viewport is considered mobile
 */
export function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Initial check
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < breakpoint)
    }

    // Check on mount
    checkIfMobile()

    // Add resize event listener
    window.addEventListener('resize', checkIfMobile)

    // Clean up
    return () => window.removeEventListener('resize', checkIfMobile)
  }, [breakpoint])

  return isMobile
}
