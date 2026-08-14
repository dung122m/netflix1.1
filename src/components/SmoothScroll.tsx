"use client";
import { ReactNode, useEffect, useLayoutEffect, useRef } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { usePathname } from "next/navigation";

export default function SmoothScroll({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.05,
      respectReducedMotion: false,
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 0.75,
      anchors: {
        duration: 0.9,
      },
    });
    lenisRef.current = lenis;

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    if (!pathname.startsWith("/movies/")) return;

    const frame = requestAnimationFrame(() => {
      lenisRef.current?.resize();
      lenisRef.current?.scrollTo(0, { immediate: true, force: true });
    });

    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return <>{children}</>;
}
