import { describe, expect, test } from 'bun:test';
import { render, screen } from '@testing-library/react';
import { EmptyState } from './empty-state';
import { Section } from './section';

describe('Section', () => {
  test('is a region named by its h2, with the heading outside the surface', () => {
    const { container } = render(
      <Section title="Up next" description="Dispatched top to bottom.">
        <p>rows</p>
      </Section>,
    );
    const region = screen.getByRole('region', { name: 'Up next' });
    const heading = screen.getByRole('heading', { level: 2, name: 'Up next' });
    expect(region.contains(heading)).toBe(true);
    const body = container.querySelector('[data-section-body]');
    expect(body?.contains(heading)).toBe(false);
    expect(body?.textContent).toBe('rows');
    expect(screen.getByText('Dispatched top to bottom.')).not.toBeNull();
  });

  test('the body is the content surface, padded, by default — never glass', () => {
    const { container } = render(<Section title="Recent">x</Section>);
    const body = container.querySelector('[data-section-body]');
    expect(body?.className).toContain('surface-content');
    expect(body?.className).toContain('p-4');
    expect(body?.className).not.toContain('glass');
  });

  test('pad="none" runs rows edge to edge; surface="none" draws no box', () => {
    const { container, rerender } = render(
      <Section title="Up next" pad="none">
        x
      </Section>,
    );
    let body = container.querySelector('[data-section-body]');
    expect(body?.className).toContain('surface-content');
    expect(body?.className).not.toContain('p-4');
    rerender(
      <Section title="Projects" surface="none">
        <EmptyState title="No projects yet" align="start" />
      </Section>,
    );
    body = container.querySelector('[data-section-body]');
    expect(body?.className).not.toContain('surface-content');
  });

  test('actions sit beside the title; headingLevel moves the heading down', () => {
    render(
      <Section
        title="Members"
        headingLevel={3}
        actions={<button type="button">Invite</button>}
      >
        x
      </Section>,
    );
    expect(
      screen.getByRole('heading', { level: 3, name: 'Members' }),
    ).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Invite' })).not.toBeNull();
  });

  test('passes id through, for an in-page table of contents', () => {
    const { container } = render(
      <Section title="Automation" id="automation">
        x
      </Section>,
    );
    expect(container.querySelector('section')?.id).toBe('automation');
  });
});
