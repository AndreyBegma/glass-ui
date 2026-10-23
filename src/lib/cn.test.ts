import { describe, expect, test } from 'bun:test';
import { cn } from './cn';

/**
 * #123 - tailwind-merge files unknown `text-*` classes under text colour, so
 * anything that merged a token type-scale size through `cn` lost it the
 * moment a colour came later. Sizes and colours have to be orthogonal, and
 * two sizes still have to settle last-wins.
 */
describe('cn', () => {
  test('a type-scale size survives a colour, either order (#123)', () => {
    expect(cn('px-2 text-body text-ink-2')).toContain('text-body');
    expect(cn('px-2 text-ink-2 text-body')).toContain('text-body');
  });

  test('the size survives hover variants too (#123)', () => {
    expect(cn('text-body text-ink-2 hover:text-ink')).toContain('text-body');
    expect(cn('text-body text-ink-2 hover:text-ink')).toContain('hover:text-ink');
  });

  test('two type-scale sizes still settle last-wins (#123)', () => {
    expect(cn('text-body text-heading')).toBe('text-heading');
    expect(cn('text-heading text-body')).toBe('text-body');
  });

  test('a core size can still override a token size (#123)', () => {
    expect(cn('text-body text-sm')).toBe('text-sm');
  });

  test('colours keep resolving last-wins (#123)', () => {
    expect(cn('text-ink-2 text-ink')).toBe('text-ink');
  });

  test('unrelated utilities are untouched (#123)', () => {
    const out = cn('px-2 text-body text-ink-2');
    expect(out).toContain('px-2');
    expect(out).toContain('text-body');
    expect(out).toContain('text-ink-2');
  });
});