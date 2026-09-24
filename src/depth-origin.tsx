'use client';

import { useEffect } from 'react';

/** The element `base.css` sends back when a sheet opens — its one contract. */
const PAGE_ID = 'main-content';

/** The attribute Radix's scroll lock puts on `<body>` while a modal surface holds it. */
const LOCK_ATTRIBUTE = 'data-scroll-locked';

/**
 * BUG-20260924-698 — the page goes back around the middle of the screen, not
 * the top of the document.
 *
 * `base.css` scales `#main-content` to 0.955 while a `Dialog` or `Sheet`
 * holds the scroll lock (FEAT-20260823-364). The page is as tall as the
 * document, so a `transform-origin` written in CSS alone is relative to the
 * document: `top center` slid a page scrolled 1200px up by 89px on every open,
 * and ~4.5% of any scroll offset in general. The middle of the viewport is a
 * point that only the scroll position knows, so it is measured here and
 * handed to the stylesheet as `--depth-origin-y`.
 *
 * **Once per open, not per scroll.** A `MutationObserver` on `<body>`'s lock
 * attribute writes the property when the lock appears. The observer's
 * callback is a microtask, so the value is in place before the frame in which
 * the transition starts; and nothing can scroll the page while it is locked,
 * so the value stays right until the lock goes. It is never cleared: the page
 * comes back forward around the same point it went back around. A scroll
 * listener would write on every frame, and the property sits on the one
 * element the whole page is inside.
 *
 * The page's document offset is summed through `offsetTop`, which ignores
 * transforms — a second lock stacking on the first (a dialog opened from a
 * sheet) measures while the page is already scaled, and a transformed
 * `getBoundingClientRect()` would move the origin.
 *
 * Mounted once, beside `MaterialLight`, for the same reason that one is: the
 * effect is the application's, not any one dialog's. Without it the origin
 * falls back to the top of the page, which is what the effect did before.
 */
export function DepthOrigin() {
  useEffect(() => {
    const write = () => {
      if (!document.body.hasAttribute(LOCK_ATTRIBUTE)) return;
      const page = document.getElementById(PAGE_ID);
      if (!page) return;

      let top = 0;
      for (
        let el: HTMLElement | null = page;
        el;
        el = el.offsetParent as HTMLElement | null
      ) {
        top += el.offsetTop;
      }
      const middle = window.scrollY + window.innerHeight / 2 - top;
      page.style.setProperty('--depth-origin-y', `${middle}px`);
    };

    // A gate can already hold the lock when this mounts.
    write();
    const observer = new MutationObserver(write);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: [LOCK_ATTRIBUTE],
    });
    return () => observer.disconnect();
  }, []);

  return null;
}
