import { useEffect, useState } from "react";

type BreakpointKey = "sm" | "md" | "lg" | "xl" | "2xl";

const BREAKPOINT_VALUES: Record<BreakpointKey, number> = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

/**
 * Hook pomocniczy do wykrywania aktywnego breakpointu Tailwind.
 * Zwraca true, gdy szerokość okna jest większa lub równa wskazanemu progowi.
 */
export function useBreakpoint(breakpoint: BreakpointKey = "lg"): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const minWidth = BREAKPOINT_VALUES[breakpoint];
    const query = `(min-width: ${minWidth}px)`;
    const mediaQuery = window.matchMedia(query);

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Ustaw stan początkowy (na wypadek SSR).
    setMatches(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, [breakpoint]);

  return matches;
}


