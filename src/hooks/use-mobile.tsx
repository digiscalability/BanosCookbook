'use client';

import * as React from 'react';

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      setIsMobile(false);
      return;
    }

    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`) as MediaQueryList & {
      addListener?: (cb: (this: MediaQueryList, ev: MediaQueryListEvent) => void) => void;
      removeListener?: (cb: (this: MediaQueryList, ev: MediaQueryListEvent) => void) => void;
    };

    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // Older browsers may not support addEventListener on MediaQueryList
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange as unknown as EventListener);
    } else if (typeof mql.addListener === 'function') {
      mql.addListener(
        onChange as unknown as (this: MediaQueryList, ev: MediaQueryListEvent) => void
      );
    }

    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    return () => {
      try {
        if (typeof mql.removeEventListener === 'function') {
          mql.removeEventListener('change', onChange as unknown as EventListener);
        } else if (typeof mql.removeListener === 'function') {
          mql.removeListener(
            onChange as unknown as (this: MediaQueryList, ev: MediaQueryListEvent) => void
          );
        }
      } catch {
        // no-op
      }
    };
  }, []);

  return !!isMobile;
}
