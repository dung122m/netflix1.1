"use client";
import { useEffect } from "react";

export default function SetTitleClient({ title }: { title: string }) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const desired = `Nanaflix - ${title}`;
    // Set immediately
    document.title = desired;

    // If something else changes <title> after hydration, observe and restore
    const titleEl = document.querySelector("title");

    const restore = () => {
      if (document.title !== desired) document.title = desired;
    };

    let observer: MutationObserver | null = null;
    if (titleEl) {
      observer = new MutationObserver(() => {
        // Only set if different to avoid infinite loop
        if (document.title !== desired) document.title = desired;
      });
      observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
    }

    // Extra safety: re-apply after short delays (covers frameworks that replace head)
    const t1 = setTimeout(restore, 300);
    const t2 = setTimeout(restore, 800);

    return () => {
      if (observer) observer.disconnect();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [title]);

  return null;
}
