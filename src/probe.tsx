/**
 * SPIKE — FEAT-20260831-501 phase 1. Deleted before this branch is reviewed.
 *
 * Every class here is used nowhere in `apps/web`, verified by grep before it was
 * written. If they reach the served stylesheet, Tailwind is scanning this
 * package across the `node_modules` boundary and the extraction can proceed.
 */
export function Probe() {
  return (
    <span className="skew-y-3 underline-offset-8 bg-probe">
      glass-ui scan probe
    </span>
  );
}
