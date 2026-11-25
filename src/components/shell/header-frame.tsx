"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** The sticky navy bar around the header. */
export function HeaderFrame({ children }: { children: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    // Deep navy bar (night tokens) on every public page; it gets a soft shadow once the page scrolls.
    <header data-theme="night" className={cn("header-float sticky top-0 z-30 border-b border-line bg-surface transition-shadow duration-200", scrolled && "shadow-lift")}>{children}</header>
  );
}
