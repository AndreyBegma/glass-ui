import { describe, expect, mock, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { PeriodSwitcher } from './period-switcher';

function setup(props: Partial<Parameters<typeof PeriodSwitcher>[0]> = {}) {
  const onPrevious = mock(() => {});
  const onNext = mock(() => {});
  render(
    <PeriodSwitcher
      label="12–18 October 2026"
      onPrevious={onPrevious}
      onNext={onNext}
      previousLabel="Previous week"
      nextLabel="Next week"
      {...props}
    />,
  );
  return { onPrevious, onNext };
}

describe('PeriodSwitcher', () => {
  test('the chevrons carry the given labels and call their handlers', () => {
    const { onPrevious, onNext } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Previous week' }));
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onNext).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  test('without `onToday` there is no Today button', () => {
    setup({ todayLabel: 'Today' });
    expect(screen.queryByRole('button', { name: 'Today' })).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  test('Today calls `onToday`, and is disabled while the period is current', () => {
    const onToday = mock(() => {});
    setup({ onToday, todayLabel: 'Today' });
    const today = screen.getByRole('button', { name: 'Today' }) as HTMLButtonElement;
    expect(today.disabled).toBe(false);
    fireEvent.click(today);
    expect(onToday).toHaveBeenCalledTimes(1);
  });

  test('`isCurrent` disables Today', () => {
    setup({ onToday: () => {}, todayLabel: 'Today', isCurrent: true });
    expect((screen.getByRole('button', { name: 'Today' }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  test('the label is a live span by default and a heading on request', () => {
    const { unmount } = render(
      <PeriodSwitcher
        label="October 2026"
        onPrevious={() => {}}
        onNext={() => {}}
        previousLabel="Previous month"
        nextLabel="Next month"
      />,
    );
    const span = screen.getByText('October 2026');
    expect(span.tagName).toBe('SPAN');
    expect(span.getAttribute('aria-live')).toBe('polite');
    unmount();

    setup({ headingLevel: 2 });
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.tagName).toBe('H2');
    expect(heading.textContent).toBe('12–18 October 2026');
    expect(heading.getAttribute('aria-live')).toBe('polite');
  });
});
