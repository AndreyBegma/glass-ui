import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { Disclosure } from './disclosure';

function Controlled() {
  const [open, setOpen] = useState(false);
  return (
    <Disclosure trigger="Recurrence" open={open} onOpenChange={setOpen}>
      <p>Repeats weekly</p>
    </Disclosure>
  );
}

describe('Disclosure', () => {
  test('the trigger carries aria-expanded/aria-controls matching the panel, and toggles on click', () => {
    render(<Controlled />);
    const trigger = screen.getByRole('button', { name: 'Recurrence' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    const panelId = trigger.getAttribute('aria-controls');
    expect(panelId).not.toBeNull();
    const panel = document.getElementById(panelId as string);
    expect(panel).not.toBeNull();
    expect(panel?.style.gridTemplateRows).toBe('0fr');

    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(panel?.style.gridTemplateRows).toBe('1fr');
  });

  test('renders no portal — the panel is a plain descendant of where it was mounted', () => {
    const { container } = render(<Controlled />);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(screen.getByText('Repeats weekly').closest('div')).not.toBeNull();
  });
});
