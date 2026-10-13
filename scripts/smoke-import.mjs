/**
 * Imports each `@andrewbehma/glass-ui` subpath named on the command line and
 * exits non-zero if any of them fails. `smoke.mjs` copies this file into
 * `.smoke/` and runs it from there with `--conditions=import`, so the package
 * name resolves to the unpacked tarball.
 *
 * A stylesheet import (`import './motion.css'`) is the consumer's bundler's
 * job; Node has no loader for it. The hook below still lets Node *resolve* the
 * specifier — a missing file fails — and only replaces the loaded module with
 * an empty one.
 */
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';

registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.css')) {
      return { format: 'module', source: '', shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});

const NAME = '@andrewbehma/glass-ui';
const tarball = fileURLToPath(new URL('./node_modules/', import.meta.url));

let failed = 0;
for (const subpath of process.argv.slice(2)) {
  const specifier = subpath === '.' ? NAME : `${NAME}${subpath.slice(1)}`;
  try {
    const resolved = fileURLToPath(import.meta.resolve(specifier));
    if (!resolved.startsWith(tarball)) {
      throw new Error(`resolved outside the unpacked tarball: ${resolved}`);
    }
    const module = await import(specifier);
    if (Object.keys(module).length === 0) {
      throw new Error('imported, but exports nothing');
    }
  } catch (error) {
    failed += 1;
    console.error(`✗ ${specifier}: ${error?.message ?? error}`);
  }
}
process.exit(failed > 0 ? 1 : 0);
