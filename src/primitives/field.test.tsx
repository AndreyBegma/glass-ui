import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Input, SearchField, Select } from './field';

/**
 * FEAT-20260911-006 — the density scale, consumed. See `button.test.tsx` for
 * why this reads `tokens.css` directly rather than trusting the class name on
 * its own.
 */
const TOKENS_CSS = readFileSync(
  join(new URL('.', import.meta.url).pathname, '..', 'tokens.css'),
  'utf8',
).replace(/\/\*[\s\S]*?\*\//g, ' ');

function block(marker: string): string {
  const at = TOKENS_CSS.indexOf(marker);
  if (at < 0) throw new Error(`tokens.css no longer contains \`${marker}\``);
  const open = TOKENS_CSS.indexOf('{', at);
  let depth = 0;
  for (let i = open; i < TOKENS_CSS.length; i++) {
    if (TOKENS_CSS[i] === '{') depth++;
    else if (TOKENS_CSS[i] === '}' && --depth === 0) return TOKENS_CSS.slice(open + 1, i);
  }
  throw new Error(`unbalanced braces after \`${marker}\``);
}

function tokenValue(body: string, name: string): string {
  const found = body.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  if (!found) throw new Error(`no \`${name}\` in this block`);
  return found[1].trim();
}

const SOFA = block('@theme static');
const DESK = block(':root:where([data-scale="desk"])');

describe('the field controls read the density scale', () => {
  test('`Input` is `h-(--size-field)`', () => {
    render(<Input aria-label="Name" />);
    expect(screen.getByRole('textbox', { name: 'Name' }).className).toContain(
      'h-(--size-field)',
    );
  });

  test('`Select` is `h-(--size-field)`, matching `Input`', () => {
    render(
      <Select aria-label="Country">
        <option>UK</option>
      </Select>,
    );
    expect(screen.getByRole('combobox', { name: 'Country' }).className).toContain(
      'h-(--size-field)',
    );
  });

  test('`SearchField`\'s input is `h-(--size-field)`', () => {
    render(<SearchField aria-label="Search" />);
    expect(screen.getByRole('searchbox', { name: 'Search' }).className).toContain(
      'h-(--size-field)',
    );
  });

  test('the sofa rung measures what `Input` and `Select` drew before: 44px', () => {
    expect(tokenValue(SOFA, '--size-field')).toBe('44px');
  });

  test('the desk rung measures 28px', () => {
    expect(tokenValue(DESK, '--size-field')).toBe('28px');
  });
});
