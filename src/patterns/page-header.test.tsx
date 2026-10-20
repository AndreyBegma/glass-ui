import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { Archive, Plus } from 'lucide-react';
import { StatusPill } from '../primitives/status-pill';
import { MetaBar } from './meta-bar';
import { PageHeader } from './page-header';

describe('PageHeader', () => {
  test('the title is the one h1, at the 28 px display step', () => {
    render(<PageHeader title="Agent Fleet" />);
    const h1 = screen.getByRole('heading', { level: 1, name: 'Agent Fleet' });
    expect(h1.className).toContain('text-display');
  });

  test('status sits beside the title, outside the h1, so the name stays clean', () => {
    const { container } = render(
      <PageHeader
        title="Agent Fleet"
        status={<StatusPill status="running" />}
      />,
    );
    const status = container.querySelector('[data-page-header-status]');
    expect(status?.querySelector('[data-status="running"]')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Agent Fleet',
    );
  });

  test('eyebrow, description, meta and actions render when given and are absent otherwise', () => {
    const { container, rerender } = render(
      <PageHeader
        title="Run 12"
        eyebrow="Run"
        description="What this page is for."
        meta={<span>counters</span>}
        actions={<button type="button">New</button>}
      />,
    );
    expect(
      container.querySelector('[data-page-header-eyebrow]')?.textContent,
    ).toBe('Run');
    expect(screen.getByText('What this page is for.')).not.toBeNull();
    expect(
      container.querySelector('[data-page-header-meta]')?.textContent,
    ).toBe('counters');
    expect(
      container.querySelector('[data-page-header-actions]')?.textContent,
    ).toBe('New');
    rerender(<PageHeader title="Run 12" />);
    for (const hook of ['eyebrow', 'status', 'meta', 'actions']) {
      expect(container.querySelector(`[data-page-header-${hook}]`)).toBeNull();
    }
  });

  test('actions wrap below the title at full width under sm, and sit right from sm', () => {
    const { container } = render(
      <PageHeader title="Fleet" actions={<button type="button">New</button>} />,
    );
    const header = container.querySelector('[data-page-header]');
    expect(header?.className).toContain('flex-col');
    expect(header?.className).toContain('sm:flex-row');
    const actions = container.querySelector('[data-page-header-actions]');
    expect(actions?.className).toContain('w-full');
    expect(actions?.className).toContain('sm:w-auto');
  });

  test('headingId labels the page region', () => {
    render(<PageHeader title="Fleet" headingId="page-title" />);
    expect(screen.getByRole('heading', { level: 1 }).id).toBe('page-title');
  });

  test('MetaBar in the meta slot adds counters and no second heading or header', () => {
    const { container } = render(
      <PageHeader
        title="Agent Fleet"
        meta={
          <MetaBar
            counters={[
              { value: 12, label: 'Agents' },
              { value: 1, label: 'Blocked', tone: 'blocked' },
            ]}
          />
        }
      />,
    );
    expect(screen.getAllByRole('heading')).toHaveLength(1);
    expect(container.querySelectorAll('header')).toHaveLength(1);
    expect(
      Array.from(
        container.querySelectorAll('[data-meta-counter]'),
        (el) => el.textContent,
      ),
    ).toEqual(['12 Agents', '1 Blocked']);
  });

  test('primaryAction as data is the one solid button, after the secondary actions', () => {
    let clicked = 0;
    const { container } = render(
      <PageHeader
        title="Queue"
        actions={<button type="button">Pause queue</button>}
        primaryAction={{
          label: 'Add to queue',
          icon: Plus,
          onClick: () => clicked++,
        }}
      />,
    );
    const add = screen.getByRole('button', { name: 'Add to queue' });
    expect(add.className).toContain('bg-accent');
    const row = container.querySelector('[data-page-header-actions]');
    const buttons = Array.from(
      row?.querySelectorAll('button') ?? [],
      (b) => b.textContent,
    );
    expect(buttons).toEqual(['Pause queue', 'Add to queue']);
    fireEvent.click(add);
    expect(clicked).toBe(1);
  });

  test('an href primary action goes through `link`, and is a plain anchor without it', () => {
    const { rerender } = render(
      <PageHeader
        title="Project"
        primaryAction={{ label: 'Open Board', href: '/board' }}
      />,
    );
    const plain = screen.getByRole('link', { name: 'Open Board' });
    expect(plain.getAttribute('href')).toBe('/board');
    expect(plain.className).toContain('bg-accent');
    rerender(
      <PageHeader
        title="Project"
        primaryAction={{ label: 'Open Board', href: '/board' }}
        link={({ href, className, children }) => (
          <a data-routed="" href={href} className={className}>
            {children}
          </a>
        )}
      />,
    );
    expect(
      screen
        .getByRole('link', { name: 'Open Board' })
        .hasAttribute('data-routed'),
    ).toBe(true);
  });

  test('primaryActionOnPhone="hidden" hides it below the tablet edge only', () => {
    const { container } = render(
      <PageHeader
        title="Queue"
        primaryActionOnPhone="hidden"
        primaryAction={{ label: 'Add', onClick: () => {} }}
      />,
    );
    const slot = container.querySelector('[data-page-header-primary]');
    expect(slot?.className).toContain('max-tablet:hidden');
  });

  test('overflow is a named … button whose menu runs each item', async () => {
    const picked: string[] = [];
    render(
      <PageHeader
        title="Project"
        overflow={[
          {
            id: 'export',
            label: 'Export CSV',
            onSelect: () => picked.push('export'),
          },
          {
            id: 'archive',
            label: 'Archive project',
            icon: Archive,
            tone: 'danger',
            onSelect: () => picked.push('archive'),
          },
        ]}
      />,
    );
    const more = screen.getByRole('button', { name: 'More actions' });
    expect(more.getAttribute('aria-haspopup')).toBe('menu');
    fireEvent.keyDown(more, { key: 'Enter' });
    const archive = await screen.findByRole('menuitem', {
      name: 'Archive project',
    });
    fireEvent.click(archive);
    expect(picked).toEqual(['archive']);
  });

  test('an empty overflow draws nothing, and no row at all without actions', () => {
    const { container } = render(<PageHeader title="Work" overflow={[]} />);
    expect(container.querySelector('[data-page-header-actions]')).toBeNull();
    expect(container.querySelector('[data-page-header-overflow]')).toBeNull();
  });
});
