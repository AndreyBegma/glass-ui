'use client';

import { useEffect } from 'react';

/**
 * FEAT-20260823-364 — where the light is, for every glass surface at once.
 *
 * Real glass has a highlight, and the highlight is somewhere: it moves as you
 * move relative to the panel. Ours had a fixed inset line along the top edge,
 * which is a drawing of a highlight rather than one — it says the same thing
 * wherever the eye and the finger happen to be.
 *
 * This writes the pointer's position into two custom properties on whichever
 * `.lit` surface it is over, and `globals.css` draws a soft radial there. It is
 * the cheap end of the family of effects liquefy-ui reaches for a WebGL overlay
 * shader to get — rim light, pointer glow, sheen — and it costs one gradient
 * whose centre is two numbers.
 *
 * **One listener for the whole application, not one per component.** The first
 * version was a hook, and every surface that wanted a highlight had to take a
 * ref and remember to attach it. That is the shape the brief warns about: a
 * dozen components each implementing their own unrelated version of the same
 * material. Delegation makes `lit` a class and nothing else, so a new surface
 * opts in by naming the material rather than by wiring an effect.
 *
 * The cost is one `pointermove` handler doing one `closest()` call, throttled
 * to roughly a frame — `pointermove` fires far more often than the screen
 * refreshes, and writing a custom property on every one of them is the
 * difference between a gradient and a stutter.
 *
 * The throttle is a timestamp rather than `requestAnimationFrame`, which was
 * the first version. rAF is the more principled choice for visual work, but it
 * does not run in a backgrounded tab, and the failure mode is a highlight that
 * simply never appears with nothing to indicate why. A guard that behaves the
 * same in every tab state is worth more here than frame alignment for a
 * property that only matters when a frame is painted anyway.
 *
 * Nothing is attached on a device that cannot hover. A television has no
 * pointer; a phone gets the press half only, which is `:active` in CSS and
 * needs no JavaScript at all — a highlight that tracked a finger would be a
 * highlight underneath a finger.
 */
export function MaterialLight() {
  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const FRAME_MS = 16;
    let last = 0;
    let current: HTMLElement | null = null;

    const unlight = () => {
      if (current) current.style.setProperty('--lit', '0');
      current = null;
    };

    const onMove = (e: PointerEvent) => {
      const target = (e.target as Element | null)?.closest?.('.lit') as
        | HTMLElement
        | null;

      if (!target) {
        unlight();
        return;
      }

      // A surface the pointer has just entered is lit immediately; only
      // movement *within* one is throttled, so the first frame is never late.
      const now = e.timeStamp;
      if (target === current && now - last < FRAME_MS) return;
      last = now;

      if (current && current !== target) current.style.setProperty('--lit', '0');

      const rect = target.getBoundingClientRect();
      target.style.setProperty('--lx', `${e.clientX - rect.left}px`);
      target.style.setProperty('--ly', `${e.clientY - rect.top}px`);
      target.style.setProperty('--lit', '1');
      current = target;
    };

    // The pointer can leave the window without ever crossing a surface's edge.
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', unlight);
    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', unlight);
    };
  }, []);

  return null;
}
