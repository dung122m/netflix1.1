"use client";

import React, { useEffect } from "react";

/**
 * Nanaflix TV-friendly Spatial Navigation (Phase 1 + P0 Extension)
 *
 * Chức năng:
 * - Điều khiển toàn bộ chuỗi: Navbar ↔ Hero CTAs ↔ FilterBar ↔ MovieGrid ↔ CinemaPlayer.
 * - Spatial Navigation 2D: tính toán tọa độ thực tế (bounding client rect) để nhảy giữa các hàng và cột chính xác.
 * - Hỗ trợ Dropdown Chips trong FilterBar: điều hướng lưới chips 2D, phím Escape/Backspace đóng dropdown trả focus về trigger.
 * - Cuộn mượt (smooth scrollIntoView) khi element nằm ngoài viewport.
 * - An toàn tuyệt đối: Không ảnh hưởng đến chuột trên PC (giữ nguyên Hover Intent 200ms), không ảnh hưởng touch mobile.
 * - Tránh xung đột: Tự động nhường quyền khi đang gõ phím trong Input, mở Modal, hoặc đang trong trình phát CinemaPlayer.
 */
export const TvNavigationHandler: React.FC = () => {
  useEffect(() => {
    function isNavigationBlocked(): boolean {
      if (typeof document === "undefined") return true;

      // 1. Nếu đang focus vào input, textarea, select hoặc contenteditable -> Bỏ qua
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.tagName === "SELECT" ||
          active.isContentEditable)
      ) {
        return true;
      }

      // 2. Nếu có bất kỳ modal / dialog / popup nào đang mở (ngoại trừ filter dropdown)
      const hasOpenModal = Boolean(
        document.querySelector('[role="dialog"]') ||
          document.querySelector(".modal-backdrop") ||
          document.querySelector('[data-modal="open"]') ||
          document.querySelector(".auth-modal") ||
          document.body.classList.contains("overflow-hidden")
      );
      if (hasOpenModal) {
        return true;
      }

      // 3. Nếu focus ĐANG NẰM TRONG CinemaPlayer hoặc các control/episode của player -> Để CinemaPlayer tự xử lý
      if (
        active instanceof HTMLElement &&
        (active.hasAttribute("data-player-control") ||
          active.hasAttribute("data-tv-episode") ||
          active.hasAttribute("data-player-menu-item") ||
          active.closest('[data-cinema-player="true"]'))
      ) {
        return true;
      }

      return false;
    }

    function getVisibleCards(): HTMLElement[] {
      const elements = Array.from(
        document.querySelectorAll<HTMLElement>('[data-tv-card="true"]')
      );
      return elements.filter((el) => {
        if (!el.isConnected || el.offsetParent === null) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    }

    function getVisibleHeroCtas(): HTMLElement[] {
      const elements = Array.from(
        document.querySelectorAll<HTMLElement>('[data-tv-hero="true"]')
      );
      return elements.filter((el) => {
        if (!el.isConnected || el.offsetParent === null) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    }

    function getVisibleFilterTriggers(): HTMLElement[] {
      const elements = Array.from(
        document.querySelectorAll<HTMLElement>('[data-tv-filter="true"]')
      );
      return elements.filter((el) => {
        if (!el.isConnected || el.offsetParent === null) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    }

    function getVisibleChips(): HTMLElement[] {
      const elements = Array.from(
        document.querySelectorAll<HTMLElement>('[data-tv-filter-chip="true"]')
      );
      return elements.filter((el) => {
        if (!el.isConnected || el.offsetParent === null) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    }

    function getVisibleRecommendationControls(): HTMLElement[] {
      const elements = Array.from(
        document.querySelectorAll<HTMLElement>('[data-tv-recommendation="true"]')
      );
      return elements.filter((el) => {
        if (!el.isConnected || el.offsetParent === null) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    }

    function getVisibleLiveControls(): HTMLElement[] {
      const elements = Array.from(
        document.querySelectorAll<HTMLElement>('[data-tv-live="true"]')
      );
      return elements.filter((el) => {
        if (!el.isConnected || el.offsetParent === null) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    }

    function getVisiblePaginationControls(): HTMLElement[] {
      const elements = Array.from(
        document.querySelectorAll<HTMLElement>('[data-tv-pagination="true"]')
      );
      return elements.filter((el) => {
        if (!el.isConnected || el.offsetParent === null) return false;
        if (el.getAttribute("aria-disabled") === "true" || el.tabIndex === -1) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
    }

    function findInitialCard(cards: HTMLElement[]): HTMLElement | null {
      if (cards.length === 0) return null;

      // Tìm các card đang nằm trong vùng nhìn (viewport)
      const inViewport = cards
        .map((el) => ({ el, rect: el.getBoundingClientRect() }))
        .filter(
          ({ rect }) =>
            rect.top >= -50 &&
            rect.top < window.innerHeight &&
            rect.bottom > 50 &&
            rect.left >= 0 &&
            rect.right <= window.innerWidth + 50
        );

      if (inViewport.length > 0) {
        // Sắp xếp theo thứ tự đọc (từ trên xuống, từ trái sang)
        inViewport.sort((a, b) => {
          if (Math.abs(a.rect.top - b.rect.top) > 30) {
            return a.rect.top - b.rect.top;
          }
          return a.rect.left - b.rect.left;
        });
        return inViewport[0].el;
      }

      return cards[0] || null;
    }

    function findNextElement2D(
      currentEl: HTMLElement,
      direction: "left" | "right" | "up" | "down",
      elements: HTMLElement[]
    ): HTMLElement | null {
      const currentRect = currentEl.getBoundingClientRect();
      const currentCenterX = currentRect.left + currentRect.width / 2;
      const currentCenterY = currentRect.top + currentRect.height / 2;

      const candidates = elements.filter((c) => c !== currentEl);
      if (candidates.length === 0) return null;

      if (direction === "right") {
        // 1. Tìm phần tử trên cùng hàng ở bên phải
        const sameRowRight = candidates
          .map((el) => ({ el, rect: el.getBoundingClientRect() }))
          .filter(
            ({ rect }) =>
              rect.left >= currentRect.left + 5 &&
              Math.abs(rect.top + rect.height / 2 - currentCenterY) <
                Math.max(currentRect.height * 0.45, 20)
          )
          .sort((a, b) => a.rect.left - b.rect.left);

        if (sameRowRight.length > 0) {
          return sameRowRight[0].el;
        }

        // 2. Hết hàng -> Tự động chuyển xuống phần tử đầu tiên của hàng kế tiếp
        const nextRowElements = candidates
          .map((el) => ({ el, rect: el.getBoundingClientRect() }))
          .filter(({ rect }) => rect.top >= currentRect.bottom - 10)
          .sort((a, b) => {
            if (Math.abs(a.rect.top - b.rect.top) > 15) {
              return a.rect.top - b.rect.top;
            }
            return a.rect.left - b.rect.left;
          });

        if (nextRowElements.length > 0) {
          return nextRowElements[0].el;
        }
        return null;
      }

      if (direction === "left") {
        // 1. Tìm phần tử trên cùng hàng ở bên trái
        const sameRowLeft = candidates
          .map((el) => ({ el, rect: el.getBoundingClientRect() }))
          .filter(
            ({ rect }) =>
              rect.right <= currentRect.right - 5 &&
              Math.abs(rect.top + rect.height / 2 - currentCenterY) <
                Math.max(currentRect.height * 0.45, 20)
          )
          .sort((a, b) => b.rect.right - a.rect.right);

        if (sameRowLeft.length > 0) {
          return sameRowLeft[0].el;
        }

        // 2. Đầu hàng -> Tự động chuyển lên phần tử cuối cùng của hàng trước đó
        const prevRowElements = candidates
          .map((el) => ({ el, rect: el.getBoundingClientRect() }))
          .filter(({ rect }) => rect.bottom <= currentRect.top + 10)
          .sort((a, b) => {
            if (Math.abs(b.rect.top - a.rect.top) > 15) {
              return b.rect.top - a.rect.top;
            }
            return b.rect.right - a.rect.right;
          });

        if (prevRowElements.length > 0) {
          return prevRowElements[0].el;
        }
        return null;
      }

      if (direction === "down") {
        const below = candidates
          .map((el) => ({ el, rect: el.getBoundingClientRect() }))
          .filter(({ rect }) => rect.top >= currentRect.top + 15);

        if (below.length === 0) return null;

        const minTopDiff = Math.min(
          ...below.map((b) => b.rect.top - currentRect.top)
        );
        const rowBand = below.filter(
          (b) =>
            Math.abs(b.rect.top - currentRect.top - minTopDiff) <
            Math.max(currentRect.height * 0.4, 25)
        );

        rowBand.sort((a, b) => {
          const distA = Math.abs(a.rect.left + a.rect.width / 2 - currentCenterX);
          const distB = Math.abs(b.rect.left + b.rect.width / 2 - currentCenterX);
          return distA - distB;
        });

        return rowBand[0]?.el || null;
      }

      if (direction === "up") {
        const above = candidates
          .map((el) => ({ el, rect: el.getBoundingClientRect() }))
          .filter(({ rect }) => rect.bottom <= currentRect.bottom - 15);

        if (above.length === 0) return null;

        const minBottomDiff = Math.min(
          ...above.map((a) => currentRect.bottom - a.rect.bottom)
        );
        const rowBand = above.filter(
          (a) =>
            Math.abs(currentRect.bottom - a.rect.bottom - minBottomDiff) <
            Math.max(currentRect.height * 0.4, 25)
        );

        rowBand.sort((a, b) => {
          const distA = Math.abs(a.rect.left + a.rect.width / 2 - currentCenterX);
          const distB = Math.abs(b.rect.left + b.rect.width / 2 - currentCenterX);
          return distA - distB;
        });

        return rowBand[0]?.el || null;
      }

      return null;
    }

    function focusAndScroll(target: HTMLElement) {
      target.focus({ preventScroll: true });
      target.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "nearest",
      });
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isNavigationBlocked()) return;

      const key = e.key;
      const active = document.activeElement;

      // Xử lý phím Escape / Backspace khi đang focus vào card, hero, filter, recommendation, live, pagination hoặc navbar
      if (key === "Escape") {
        if (
          active instanceof HTMLElement &&
          (active.hasAttribute("data-tv-card") ||
            active.hasAttribute("data-tv-nav") ||
            active.hasAttribute("data-tv-hero") ||
            active.hasAttribute("data-tv-filter") ||
            active.hasAttribute("data-tv-recommendation") ||
            active.hasAttribute("data-tv-live") ||
            active.hasAttribute("data-tv-pagination"))
        ) {
          e.preventDefault();
          active.blur();
          return;
        }
      }

      if (key === "Backspace") {
        if (
          active instanceof HTMLElement &&
          (active.hasAttribute("data-tv-card") ||
            active.hasAttribute("data-tv-nav") ||
            active.hasAttribute("data-tv-hero") ||
            active.hasAttribute("data-tv-filter") ||
            active.hasAttribute("data-tv-recommendation") ||
            active.hasAttribute("data-tv-live") ||
            active.hasAttribute("data-tv-pagination"))
        ) {
          e.preventDefault();
          if (window.history.length > 1) {
            window.history.back();
          }
          return;
        }
      }

      // Chỉ xử lý các phím mũi tên
      if (
        key !== "ArrowRight" &&
        key !== "ArrowLeft" &&
        key !== "ArrowDown" &&
        key !== "ArrowUp"
      ) {
        return;
      }

      // =========================================================
      // 1. NẾU FOCUS ĐANG Ở HEADER / NAVBAR (data-tv-nav="true")
      // =========================================================
      const isNavFocused =
        active instanceof HTMLElement && active.hasAttribute("data-tv-nav");
      if (isNavFocused) {
        const navItems = Array.from(
          document.querySelectorAll<HTMLElement>('[data-tv-nav="true"]')
        ).filter((el) => el.offsetParent !== null);
        const currentNavIdx = navItems.findIndex((el) => el === active);

        if (key === "ArrowRight") {
          e.preventDefault();
          const nextIdx =
            currentNavIdx < navItems.length - 1 ? currentNavIdx + 1 : 0;
          navItems[nextIdx]?.focus();
          return;
        }
        if (key === "ArrowLeft") {
          e.preventDefault();
          const prevIdx =
            currentNavIdx > 0 ? currentNavIdx - 1 : navItems.length - 1;
          navItems[prevIdx]?.focus();
          return;
        }
        if (key === "ArrowDown") {
          e.preventDefault();
          // A. Ưu tiên chuyển xuống CinemaPlayer nếu có trên trang
          const cinemaPlayer = document.querySelector<HTMLElement>(
            '[data-cinema-player="true"]'
          );
          const scrubBar = document.querySelector<HTMLElement>(
            '[data-control-id="scrub-bar"]'
          );
          const mainControl = document.querySelector<HTMLElement>(
            '[data-control-section="main-controls"]'
          );
          const playerTarget = cinemaPlayer || scrubBar || mainControl;
          if (playerTarget && playerTarget.offsetParent !== null) {
            focusAndScroll(playerTarget);
            return;
          }

          // B. Ưu tiên Hero CTA nếu Hero đang hiện diện
          const heroCtas = getVisibleHeroCtas();
          if (heroCtas.length > 0) {
            focusAndScroll(heroCtas[0]);
            return;
          }

          // C. Ưu tiên Live Hub tabs / controls nếu đang ở trang Live TV
          const liveControls = getVisibleLiveControls();
          if (liveControls.length > 0) {
            focusAndScroll(liveControls[0]);
            return;
          }

          // D. Ưu tiên FilterBar nếu có FilterBar trên trang
          const filterTriggers = getVisibleFilterTriggers();
          if (filterTriggers.length > 0) {
            focusAndScroll(filterTriggers[0]);
            return;
          }

          // E. Ưu tiên Quick Filter Chips nếu có trên trang
          const chips = getVisibleChips();
          if (chips.length > 0) {
            const selectedChip = chips.find(
              (c) => c.getAttribute("data-selected") === "true"
            );
            focusAndScroll(selectedChip || chips[0]);
            return;
          }

          // F. Ưu tiên RecommendationTabs nếu có trên trang
          const recControls = getVisibleRecommendationControls();
          if (recControls.length > 0) {
            focusAndScroll(recControls[0]);
            return;
          }

          // G. Chuyển xuống card đầu tiên
          const cards = getVisibleCards();
          const initial = findInitialCard(cards);
          if (initial) {
            focusAndScroll(initial);
          }
          return;
        }
        if (key === "ArrowUp") {
          e.preventDefault();
          return;
        }
      }

      // =========================================================
      // 2. NẾU FOCUS ĐANG Ở HERO CTA (data-tv-hero="true")
      // =========================================================
      const isHeroFocused =
        active instanceof HTMLElement && active.hasAttribute("data-tv-hero");
      if (isHeroFocused) {
        const heroCtas = getVisibleHeroCtas();
        const currentHeroIdx = heroCtas.findIndex((el) => el === active);

        if (key === "ArrowRight") {
          e.preventDefault();
          const nextIdx =
            currentHeroIdx < heroCtas.length - 1 ? currentHeroIdx + 1 : 0;
          heroCtas[nextIdx]?.focus();
          return;
        }
        if (key === "ArrowLeft") {
          e.preventDefault();
          const prevIdx =
            currentHeroIdx > 0 ? currentHeroIdx - 1 : heroCtas.length - 1;
          heroCtas[prevIdx]?.focus();
          return;
        }
        if (key === "ArrowUp") {
          e.preventDefault();
          const navItem =
            document.querySelector<HTMLElement>(
              'nav a[data-tv-nav="true"].light-nav-active'
            ) || document.querySelector<HTMLElement>('[data-tv-nav="true"]');
          if (navItem) {
            navItem.focus();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
          return;
        }
        if (key === "ArrowDown") {
          e.preventDefault();
          // 1. FilterBar nếu có
          const filterTriggers = getVisibleFilterTriggers();
          if (filterTriggers.length > 0) {
            focusAndScroll(filterTriggers[0]);
            return;
          }
          // 2. Quick Filter Chips nếu có
          const chips = getVisibleChips();
          if (chips.length > 0) {
            const selectedChip = chips.find(
              (c) => c.getAttribute("data-selected") === "true"
            );
            focusAndScroll(selectedChip || chips[0]);
            return;
          }
          // 3. RecommendationTabs nếu có
          const recControls = getVisibleRecommendationControls();
          if (recControls.length > 0) {
            focusAndScroll(recControls[0]);
            return;
          }
          // 4. MovieCard
          const cards = getVisibleCards();
          const initial = findInitialCard(cards);
          if (initial) {
            focusAndScroll(initial);
          }
          return;
        }
      }

      // =========================================================
      // 3. NẾU FOCUS ĐANG Ở FILTERBAR TRIGGER (data-tv-filter="true")
      // =========================================================
      const isFilterFocused =
        active instanceof HTMLElement && active.hasAttribute("data-tv-filter");
      if (isFilterFocused) {
        const filterTriggers = getVisibleFilterTriggers();
        const currentFilterIdx = filterTriggers.findIndex((el) => el === active);
        const chips = getVisibleChips();

        // Nếu dropdown đang mở (có chips hiển thị):
        // Phím ArrowDown hoặc ArrowRight sẽ chuyển focus vào chip (ưu tiên chip đang được chọn hoặc chip đầu tiên)
        if (chips.length > 0) {
          if (key === "ArrowDown" || key === "ArrowRight") {
            e.preventDefault();
            const selectedChip = chips.find(
              (c) => c.getAttribute("data-selected") === "true"
            );
            focusAndScroll(selectedChip || chips[0]);
            return;
          }
        }

        if (key === "ArrowRight") {
          e.preventDefault();
          const nextIdx =
            currentFilterIdx < filterTriggers.length - 1
              ? currentFilterIdx + 1
              : 0;
          filterTriggers[nextIdx]?.focus();
          return;
        }
        if (key === "ArrowLeft") {
          e.preventDefault();
          const prevIdx =
            currentFilterIdx > 0
              ? currentFilterIdx - 1
              : filterTriggers.length - 1;
          filterTriggers[prevIdx]?.focus();
          return;
        }
        if (key === "ArrowUp") {
          e.preventDefault();
          // A. Quay về Hero CTA nếu Hero đang hiện diện
          const heroCtas = getVisibleHeroCtas();
          if (heroCtas.length > 0) {
            focusAndScroll(heroCtas[0]);
            return;
          }
          // B. Quay về Navbar
          const navItem =
            document.querySelector<HTMLElement>(
              'nav a[data-tv-nav="true"].light-nav-active'
            ) || document.querySelector<HTMLElement>('[data-tv-nav="true"]');
          if (navItem) {
            navItem.focus();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
          return;
        }
        if (key === "ArrowDown") {
          e.preventDefault();
          const cards = getVisibleCards();
          const initial = findInitialCard(cards);
          if (initial) {
            focusAndScroll(initial);
          }
          return;
        }
      }

      // =========================================================
      // 4. NẾU FOCUS ĐANG Ở FILTER DROPDOWN CHIP (data-tv-filter-chip="true")
      // =========================================================
      const isChipFocused =
        active instanceof HTMLElement &&
        active.hasAttribute("data-tv-filter-chip");
      if (isChipFocused) {
        const chips = getVisibleChips();

        let chipDirection: "left" | "right" | "up" | "down" | null = null;
        if (key === "ArrowRight") chipDirection = "right";
        else if (key === "ArrowLeft") chipDirection = "left";
        else if (key === "ArrowDown") chipDirection = "down";
        else if (key === "ArrowUp") chipDirection = "up";

        if (chipDirection) {
          e.preventDefault();
          const nextChip = findNextElement2D(
            active as HTMLElement,
            chipDirection,
            chips
          );
          if (nextChip) {
            focusAndScroll(nextChip);
            return;
          }

          // Boundary transitions khi đang ở biên trong chips:
          if (chipDirection === "up") {
            // A. Nếu có trigger dropdown đang mở -> Quay về trigger
            const activeTrigger =
              document.querySelector<HTMLElement>(
                '[data-tv-filter="true"][aria-expanded="true"]'
              ) ||
              document.querySelector<HTMLElement>(
                '[data-tv-filter="true"]'
              );
            if (activeTrigger) {
              focusAndScroll(activeTrigger);
              return;
            }

            // B. Nếu có Hero CTA trên trang -> Chuyển lên Hero CTA
            const heroCtas = getVisibleHeroCtas();
            if (heroCtas.length > 0) {
              focusAndScroll(heroCtas[0]);
              return;
            }

            // C. Quay về Navbar
            const navItem =
              document.querySelector<HTMLElement>(
                'nav a[data-tv-nav="true"].light-nav-active'
              ) || document.querySelector<HTMLElement>('[data-tv-nav="true"]');
            if (navItem) {
              navItem.focus();
              window.scrollTo({ top: 0, behavior: "smooth" });
              return;
            }
          }

          if (chipDirection === "down") {
            // A. Chuyển xuống RecommendationTabs nếu có
            const recControls = getVisibleRecommendationControls();
            if (recControls.length > 0) {
              const currentRect = (active as HTMLElement).getBoundingClientRect();
              const currentCenterX = currentRect.left + currentRect.width / 2;
              const sorted = [...recControls].sort((a, b) => {
                const rectA = a.getBoundingClientRect();
                const rectB = b.getBoundingClientRect();
                const distA = Math.abs(rectA.left + rectA.width / 2 - currentCenterX);
                const distB = Math.abs(rectB.left + rectB.width / 2 - currentCenterX);
                return distA - distB;
              });
              focusAndScroll(sorted[0]);
              return;
            }

            // B. Chuyển xuống card đầu tiên
            const cards = getVisibleCards();
            const initial = findInitialCard(cards);
            if (initial) {
              focusAndScroll(initial);
              return;
            }
          }

          if (chipDirection === "left") {
            const currentIdx = chips.findIndex((c) => c === active);
            if (currentIdx === 0) {
              const activeTrigger =
                document.querySelector<HTMLElement>(
                  '[data-tv-filter="true"][aria-expanded="true"]'
                ) ||
                document.querySelector<HTMLElement>(
                  '[data-tv-filter="true"]'
                );
              if (activeTrigger) {
                focusAndScroll(activeTrigger);
                return;
              }
            }
          }

          return;
        }
      }

      // =========================================================
      // 5. NẾU FOCUS ĐANG Ở RECOMMENDATION TABS (data-tv-recommendation="true")
      // =========================================================
      const isRecFocused =
        active instanceof HTMLElement &&
        active.hasAttribute("data-tv-recommendation");
      if (isRecFocused) {
        const recControls = getVisibleRecommendationControls();
        const currentRecIdx = recControls.findIndex((el) => el === active);

        if (key === "ArrowRight") {
          e.preventDefault();
          const nextIdx =
            currentRecIdx < recControls.length - 1 ? currentRecIdx + 1 : 0;
          recControls[nextIdx]?.focus();
          return;
        }
        if (key === "ArrowLeft") {
          e.preventDefault();
          const prevIdx =
            currentRecIdx > 0 ? currentRecIdx - 1 : recControls.length - 1;
          recControls[prevIdx]?.focus();
          return;
        }
        if (key === "ArrowUp") {
          e.preventDefault();
          // A. Lên EpisodeList nếu có
          const allEpisodes = Array.from(
            document.querySelectorAll<HTMLElement>('[data-tv-episode="true"]')
          ).filter((el) => el.offsetParent !== null);
          if (allEpisodes.length > 0) {
            const lastEp = allEpisodes[allEpisodes.length - 1];
            focusAndScroll(lastEp);
            return;
          }

          // B. Lên Action Buttons nếu có
          const actionBtns = Array.from(
            document.querySelectorAll<HTMLElement>(
              '[data-control-section="action-buttons"]'
            )
          ).filter((el) => el.offsetParent !== null);
          if (actionBtns.length > 0) {
            focusAndScroll(actionBtns[0]);
            return;
          }

          // C. Lên Player Controls
          const mainCtrl = document.querySelector<HTMLElement>(
            '[data-control-section="main-controls"]'
          );
          if (mainCtrl) {
            focusAndScroll(mainCtrl);
            return;
          }

          // D. Lên Quick Filter Chips nếu có trên trang
          const chips = getVisibleChips();
          if (chips.length > 0) {
            const currentRect = (active as HTMLElement).getBoundingClientRect();
            const currentCenterX = currentRect.left + currentRect.width / 2;
            const rects = chips.map((c) => ({ chip: c, rect: c.getBoundingClientRect() }));
            const maxBottom = Math.max(...rects.map((r) => r.rect.bottom));
            const bottomRowChips = rects.filter((r) => r.rect.bottom >= maxBottom - 25);
            bottomRowChips.sort((a, b) => {
              const distA = Math.abs(a.rect.left + a.rect.width / 2 - currentCenterX);
              const distB = Math.abs(b.rect.left + b.rect.width / 2 - currentCenterX);
              return distA - distB;
            });
            if (bottomRowChips.length > 0) {
              focusAndScroll(bottomRowChips[0].chip);
              return;
            }
          }

          // E. Lên Navbar
          const navItem =
            document.querySelector<HTMLElement>(
              'nav a[data-tv-nav="true"].light-nav-active'
            ) || document.querySelector<HTMLElement>('[data-tv-nav="true"]');
          if (navItem) {
            navItem.focus();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
          return;
        }
        if (key === "ArrowDown") {
          e.preventDefault();
          const cards = getVisibleCards();
          const initial = findInitialCard(cards);
          if (initial) {
            focusAndScroll(initial);
          }
          return;
        }
      }

      // =========================================================
      // 6. NẾU FOCUS ĐANG Ở LIVE CONTROLS (data-tv-live="true")
      // =========================================================
      const isLiveControlFocused =
        active instanceof HTMLElement && active.hasAttribute("data-tv-live");
      if (isLiveControlFocused) {
        const liveControls = getVisibleLiveControls();

        let liveDir: "left" | "right" | "up" | "down" | null = null;
        if (key === "ArrowRight") liveDir = "right";
        else if (key === "ArrowLeft") liveDir = "left";
        else if (key === "ArrowDown") liveDir = "down";
        else if (key === "ArrowUp") liveDir = "up";

        if (liveDir) {
          const nextLive = findNextElement2D(
            active as HTMLElement,
            liveDir,
            liveControls
          );
          if (nextLive) {
            e.preventDefault();
            focusAndScroll(nextLive);
            return;
          }
        }

        if (key === "ArrowDown") {
          e.preventDefault();
          const cards = getVisibleCards();
          const initial = findInitialCard(cards);
          if (initial) {
            focusAndScroll(initial);
          }
          return;
        }

        if (key === "ArrowUp") {
          e.preventDefault();
          const navItem =
            document.querySelector<HTMLElement>(
              'nav a[data-tv-nav="true"].light-nav-active'
            ) || document.querySelector<HTMLElement>('[data-tv-nav="true"]');
          if (navItem) {
            navItem.focus();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
          return;
        }
      }

      // =========================================================
      // 7. NẾU FOCUS ĐANG Ở PAGINATION CONTROL (data-tv-pagination="true")
      // =========================================================
      const isPaginationFocused =
        active instanceof HTMLElement &&
        active.hasAttribute("data-tv-pagination");
      if (isPaginationFocused) {
        const paginationControls = getVisiblePaginationControls();
        const currentIdx = paginationControls.findIndex((el) => el === active);

        if (key === "ArrowRight") {
          e.preventDefault();
          if (paginationControls.length > 0) {
            const nextIdx =
              currentIdx < paginationControls.length - 1
                ? currentIdx + 1
                : 0;
            focusAndScroll(paginationControls[nextIdx]);
          }
          return;
        }

        if (key === "ArrowLeft") {
          e.preventDefault();
          if (paginationControls.length > 0) {
            const prevIdx =
              currentIdx > 0
                ? currentIdx - 1
                : paginationControls.length - 1;
            focusAndScroll(paginationControls[prevIdx]);
          }
          return;
        }

        if (key === "ArrowUp") {
          e.preventDefault();
          const cards = getVisibleCards();
          if (cards.length > 0) {
            const currentRect = (active as HTMLElement).getBoundingClientRect();
            const currentCenterX = currentRect.left + currentRect.width / 2;

            // Tìm các card ở hàng dưới cùng (bottom row)
            const rects = cards.map((c) => ({ card: c, rect: c.getBoundingClientRect() }));
            const maxBottom = Math.max(...rects.map((r) => r.rect.bottom));
            const bottomRowCards = rects.filter((r) => r.rect.bottom >= maxBottom - 80);

            const sorted = bottomRowCards.sort((a, b) => {
              const distA = Math.abs(a.rect.left + a.rect.width / 2 - currentCenterX);
              const distB = Math.abs(b.rect.left + b.rect.width / 2 - currentCenterX);
              return distA - distB;
            });

            if (sorted.length > 0) {
              focusAndScroll(sorted[0].card);
              return;
            }

            const allSorted = rects.sort((a, b) => {
              const distA = Math.abs(a.rect.left + a.rect.width / 2 - currentCenterX);
              const distB = Math.abs(b.rect.left + b.rect.width / 2 - currentCenterX);
              return distA - distB;
            });
            focusAndScroll(allSorted[0].card);
            return;
          }

          const filterTriggers = getVisibleFilterTriggers();
          if (filterTriggers.length > 0) {
            focusAndScroll(filterTriggers[0]);
            return;
          }

          const navItem =
            document.querySelector<HTMLElement>(
              'nav a[data-tv-nav="true"].light-nav-active'
            ) || document.querySelector<HTMLElement>('[data-tv-nav="true"]');
          if (navItem) {
            navItem.focus();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
          return;
        }

        if (key === "ArrowDown") {
          return;
        }
      }

      // =========================================================
      // 8. NẾU FOCUS ĐANG Ở MEDIA CARD (data-tv-card="true")
      // =========================================================
      const cards = getVisibleCards();
      const isCardFocused =
        active instanceof HTMLElement && active.hasAttribute("data-tv-card");

      // Nếu chưa có phần tử nào được focus
      if (!isCardFocused) {
        if (key === "ArrowDown") {
          e.preventDefault();
          const heroCtas = getVisibleHeroCtas();
          if (heroCtas.length > 0) {
            focusAndScroll(heroCtas[0]);
            return;
          }
          const liveControls = getVisibleLiveControls();
          if (liveControls.length > 0) {
            focusAndScroll(liveControls[0]);
            return;
          }
          const filterTriggers = getVisibleFilterTriggers();
          if (filterTriggers.length > 0) {
            focusAndScroll(filterTriggers[0]);
            return;
          }
          const recControls = getVisibleRecommendationControls();
          if (recControls.length > 0) {
            focusAndScroll(recControls[0]);
            return;
          }
          const initial = findInitialCard(cards);
          if (initial) {
            focusAndScroll(initial);
          }
          return;
        }
        if (key === "ArrowUp") {
          // Nhảy lên Navbar
          const navItem =
            document.querySelector<HTMLElement>(
              'nav a[data-tv-nav="true"].light-nav-active'
            ) || document.querySelector<HTMLElement>('[data-tv-nav="true"]');
          if (navItem) {
            e.preventDefault();
            navItem.focus();
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
          return;
        }
        return;
      }

      // Nếu đã có card đang focus, tìm card tiếp theo theo hướng không gian 2D
      let direction: "left" | "right" | "up" | "down" | null = null;
      if (key === "ArrowRight") direction = "right";
      else if (key === "ArrowLeft") direction = "left";
      else if (key === "ArrowDown") direction = "down";
      else if (key === "ArrowUp") direction = "up";

      if (!direction) return;

      const nextCard = findNextElement2D(active as HTMLElement, direction, cards);
      if (nextCard) {
        e.preventDefault();
        focusAndScroll(nextCard);
        return;
      }

      // BOUNDARY TRANSITION: Khi bấm ↓ ở hàng dưới cùng của MediaCard -> Chuyển xuống Pagination
      if (direction === "down") {
        const paginationControls = getVisiblePaginationControls();
        if (paginationControls.length > 0) {
          e.preventDefault();
          const currentRect = (active as HTMLElement).getBoundingClientRect();
          const currentCenterX = currentRect.left + currentRect.width / 2;
          const sorted = [...paginationControls].sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            const distA = Math.abs(rectA.left + rectA.width / 2 - currentCenterX);
            const distB = Math.abs(rectB.left + rectB.width / 2 - currentCenterX);
            return distA - distB;
          });
          focusAndScroll(sorted[0]);
          return;
        }
      }

      // BOUNDARY TRANSITION: Khi bấm ↑ ở hàng trên cùng của MediaCard / MatchCard / ChannelCard
      if (direction === "up") {
        e.preventDefault();
        // A. Nếu có RecommendationTabs trên trang -> Chuyển lên RecommendationTabs
        const recControls = getVisibleRecommendationControls();
        if (recControls.length > 0) {
          const currentRect = (active as HTMLElement).getBoundingClientRect();
          const currentCenterX = currentRect.left + currentRect.width / 2;
          const sorted = [...recControls].sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            const distA = Math.abs(rectA.left + rectA.width / 2 - currentCenterX);
            const distB = Math.abs(rectB.left + rectB.width / 2 - currentCenterX);
            return distA - distB;
          });
          focusAndScroll(sorted[0]);
          return;
        }

        // B. Nếu có EpisodeList trên trang -> Chuyển lên tập cuối của EpisodeList
        const allEpisodes = Array.from(
          document.querySelectorAll<HTMLElement>('[data-tv-episode="true"]')
        ).filter((el) => el.offsetParent !== null);

        if (allEpisodes.length > 0) {
          const lastEp = allEpisodes[allEpisodes.length - 1];
          focusAndScroll(lastEp);
          return;
        }

        // C. Nếu có Action Buttons hoặc Player -> Chuyển lên Player
        const actionBtns = Array.from(
          document.querySelectorAll<HTMLElement>(
            '[data-control-section="action-buttons"]'
          )
        ).filter((el) => el.offsetParent !== null);
        if (actionBtns.length > 0) {
          actionBtns[0]?.focus();
          return;
        }

        const mainCtrl = document.querySelector<HTMLElement>(
          '[data-control-section="main-controls"]'
        );
        if (mainCtrl) {
          mainCtrl.focus();
          return;
        }

        // D. Nếu có Live controls (Bóng đá/Truyền hình tabs hoặc Tournament filters) trên trang
        const liveControls = getVisibleLiveControls();
        if (liveControls.length > 0) {
          const currentRect = (active as HTMLElement).getBoundingClientRect();
          const currentCenterX = currentRect.left + currentRect.width / 2;
          const sorted = [...liveControls].sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            const distA = Math.abs(rectA.left + rectA.width / 2 - currentCenterX);
            const distB = Math.abs(rectB.left + rectB.width / 2 - currentCenterX);
            return distA - distB;
          });
          focusAndScroll(sorted[0]);
          return;
        }

        // E. Nếu có FilterBar trên trang -> Chuyển lên Filter trigger gần tâm X nhất
        const filterTriggers = getVisibleFilterTriggers();
        if (filterTriggers.length > 0) {
          const currentRect = (active as HTMLElement).getBoundingClientRect();
          const currentCenterX = currentRect.left + currentRect.width / 2;
          const sorted = [...filterTriggers].sort((a, b) => {
            const rectA = a.getBoundingClientRect();
            const rectB = b.getBoundingClientRect();
            const distA = Math.abs(rectA.left + rectA.width / 2 - currentCenterX);
            const distB = Math.abs(rectB.left + rectB.width / 2 - currentCenterX);
            return distA - distB;
          });
          focusAndScroll(sorted[0]);
          return;
        }

        // F. Nếu có Quick Filter Chips trên trang -> Chuyển lên hàng dưới cùng của Chips
        const chips = getVisibleChips();
        if (chips.length > 0) {
          const currentRect = (active as HTMLElement).getBoundingClientRect();
          const currentCenterX = currentRect.left + currentRect.width / 2;
          const rects = chips.map((c) => ({ chip: c, rect: c.getBoundingClientRect() }));
          const maxBottom = Math.max(...rects.map((r) => r.rect.bottom));
          const bottomRowChips = rects.filter((r) => r.rect.bottom >= maxBottom - 25);
          bottomRowChips.sort((a, b) => {
            const distA = Math.abs(a.rect.left + a.rect.width / 2 - currentCenterX);
            const distB = Math.abs(b.rect.left + b.rect.width / 2 - currentCenterX);
            return distA - distB;
          });
          if (bottomRowChips.length > 0) {
            focusAndScroll(bottomRowChips[0].chip);
            return;
          }
        }

        // G. Nếu có Hero CTA trên trang -> Chuyển lên Hero CTA
        const heroCtas = getVisibleHeroCtas();
        if (heroCtas.length > 0) {
          focusAndScroll(heroCtas[0]);
          return;
        }

        // H. Chuyển lên Header/Navbar
        const navItem =
          document.querySelector<HTMLElement>(
            'nav a[data-tv-nav="true"].light-nav-active'
          ) || document.querySelector<HTMLElement>('[data-tv-nav="true"]');
        if (navItem) {
          navItem.focus();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return null;
};

export default TvNavigationHandler;

