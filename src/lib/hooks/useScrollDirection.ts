"use client";

import { useState, useEffect } from "react";

type ScrollDirection = "up" | "down";

interface UseScrollDirectionOptions {
  threshold?: number;
  mobileOnly?: boolean;
}

export function useScrollDirection(options: UseScrollDirectionOptions = {}) {
  const { threshold = 50, mobileOnly = true } = options;
  const [scrollDirection, setScrollDirection] = useState<ScrollDirection>("up");
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    // Check if we should apply scroll behavior (mobile only check)
    const checkMobile = () => {
      if (mobileOnly && typeof window !== "undefined") {
        return window.innerWidth < 1024; // lg breakpoint
      }
      return true;
    };

    const handleScroll = () => {
      if (!checkMobile()) {
        setIsHidden(false);
        return;
      }

      const currentScrollY = window.scrollY;

      // Only change direction after passing threshold
      if (currentScrollY > lastScrollY && currentScrollY > threshold) {
        // Scrolling down and past threshold
        if (scrollDirection !== "down") {
          setScrollDirection("down");
          setIsHidden(true);
        }
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up
        if (scrollDirection !== "up") {
          setScrollDirection("up");
          setIsHidden(false);
        }
      }

      // At top of page, always show
      if (currentScrollY <= 10) {
        setIsHidden(false);
      }

      setLastScrollY(currentScrollY);
    };

    // Also check on resize for responsive behavior
    const handleResize = () => {
      if (!checkMobile()) {
        setIsHidden(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [lastScrollY, scrollDirection, threshold, mobileOnly]);

  return { scrollDirection, isHidden };
}
