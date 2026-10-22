import { afterEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Heart } from 'lucide-react';
import { Rating } from './rating';

afterEach(cleanup);

describe('Rating', () => {
  test('renders a named radio group of max steps', () => {
    render(<Rating label="Quality" />);
    expect(screen.getByRole('radiogroup', { name: 'Quality' })).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });

  test('max sets the step count, icon swaps the glyph', () => {
    const { container } = render(<Rating label="Love" max={3} icon={Heart} />);
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    expect(container.querySelector('svg.lucide-heart')).toBeTruthy();
  });

  describe('keyboard', () => {
    test('one tab stop: the first step when empty, the checked step otherwise', () => {
      const { rerender } = render(<Rating label="Q" />);
      const tabbable = () =>
        screen.getAllByRole('radio').filter((r) => r.tabIndex === 0);
      expect(tabbable()).toHaveLength(1);
      expect(tabbable()[0]?.getAttribute('aria-label')).toBe('1 out of 5');
      rerender(<Rating label="Q" value={3} />);
      expect(tabbable()).toHaveLength(1);
      expect(tabbable()[0]?.getAttribute('aria-label')).toBe('3 out of 5');
    });

    test('arrows move value and focus; Home and End jump; clamped', () => {
      const onValueChange = mock();
      render(
        <Rating label="Q" defaultValue={2} onValueChange={onValueChange} />,
      );
      const checked = () => screen.getByRole('radio', { checked: true });
      checked().focus();
      fireEvent.keyDown(checked(), { key: 'ArrowRight' });
      expect(onValueChange).toHaveBeenLastCalledWith(3);
      expect(document.activeElement).toBe(checked());
      fireEvent.keyDown(checked(), { key: 'ArrowLeft' });
      fireEvent.keyDown(checked(), { key: 'ArrowLeft' });
      fireEvent.keyDown(checked(), { key: 'ArrowLeft' });
      expect(onValueChange).toHaveBeenLastCalledWith(1);
      fireEvent.keyDown(checked(), { key: 'End' });
      expect(onValueChange).toHaveBeenLastCalledWith(5);
      fireEvent.keyDown(checked(), { key: 'ArrowRight' });
      expect(onValueChange).toHaveBeenLastCalledWith(5);
      fireEvent.keyDown(checked(), { key: 'Home' });
      expect(onValueChange).toHaveBeenLastCalledWith(1);
    });

    test('Space selects the focused step; the current value clears it', () => {
      const onValueChange = mock();
      render(<Rating label="Q" onValueChange={onValueChange} />);
      const third = screen.getByRole('radio', { name: '3 out of 5' });
      fireEvent.keyDown(third, { key: ' ' });
      expect(onValueChange).toHaveBeenLastCalledWith(3);
      fireEvent.keyDown(third, { key: ' ' });
      expect(onValueChange).toHaveBeenLastCalledWith(0);
    });
  });

  describe('click', () => {
    test('click commits; clicking the current value clears', () => {
      const onValueChange = mock();
      render(<Rating label="Q" onValueChange={onValueChange} />);
      fireEvent.click(screen.getByRole('radio', { name: '4 out of 5' }));
      expect(onValueChange).toHaveBeenLastCalledWith(4);
      expect(
        screen
          .getByRole('radio', { name: '4 out of 5' })
          .getAttribute('aria-checked'),
      ).toBe('true');
      fireEvent.click(screen.getByRole('radio', { name: '4 out of 5' }));
      expect(onValueChange).toHaveBeenLastCalledWith(0);
    });

    test('allowClear=false keeps the value', () => {
      const onValueChange = mock();
      render(
        <Rating
          label="Q"
          defaultValue={4}
          allowClear={false}
          onValueChange={onValueChange}
        />,
      );
      fireEvent.click(screen.getByRole('radio', { name: '4 out of 5' }));
      expect(onValueChange).toHaveBeenLastCalledWith(4);
    });

    test('controlled: shows the prop, not its own click', () => {
      render(<Rating label="Q" value={2} />);
      fireEvent.click(screen.getByRole('radio', { name: '5 out of 5' }));
      expect(
        screen
          .getByRole('radio', { name: '2 out of 5' })
          .getAttribute('aria-checked'),
      ).toBe('true');
    });
  });

  test('hover preview does not commit', () => {
    const onValueChange = mock();
    const { container } = render(
      <Rating label="Q" value={2} onValueChange={onValueChange} />,
    );
    const clips = () =>
      [...container.querySelectorAll<HTMLElement>('svg.fill-current')].map(
        (s) => s.style.clipPath,
      );
    expect(clips()[3]).toBe('inset(0 100% 0 0)');
    fireEvent.mouseEnter(screen.getByRole('radio', { name: '4 out of 5' }));
    expect(clips()[3]).toBe('inset(0 0% 0 0)');
    expect(onValueChange).not.toHaveBeenCalled();
    expect(
      screen
        .getByRole('radio', { name: '2 out of 5' })
        .getAttribute('aria-checked'),
    ).toBe('true');
    fireEvent.mouseLeave(screen.getByRole('radiogroup'));
    expect(clips()[3]).toBe('inset(0 100% 0 0)');
  });

  describe('half values', () => {
    test('allowHalf doubles the steps and steps by 0.5', () => {
      const onValueChange = mock();
      render(
        <Rating
          label="Q"
          allowHalf
          defaultValue={2}
          onValueChange={onValueChange}
        />,
      );
      expect(screen.getAllByRole('radio')).toHaveLength(10);
      const checked = screen.getByRole('radio', { checked: true });
      fireEvent.keyDown(checked, { key: 'ArrowRight' });
      expect(onValueChange).toHaveBeenLastCalledWith(2.5);
      fireEvent.click(screen.getByRole('radio', { name: '3.5 out of 5' }));
      expect(onValueChange).toHaveBeenLastCalledWith(3.5);
    });

    test('a half value clips the filled icon to half', () => {
      const { container } = render(<Rating label="Q" allowHalf value={2.5} />);
      const clips = [
        ...container.querySelectorAll<HTMLElement>('svg.fill-current'),
      ].map((s) => s.style.clipPath);
      expect(clips[2]).toBe('inset(0 50% 0 0)');
    });

    test('without allowHalf a fractional value snaps to a whole step', () => {
      render(<Rating label="Q" value={3.5} />);
      expect(
        screen.getByRole('radio', { checked: true }).getAttribute('aria-label'),
      ).toBe('4 out of 5');
    });
  });

  describe('read-only', () => {
    test('is one image named with the value', () => {
      render(<Rating label="Quality" readOnly allowHalf value={4.5} />);
      expect(
        screen.getByRole('img', { name: 'Quality, 4.5 out of 5' }),
      ).toBeTruthy();
      expect(screen.queryAllByRole('radio')).toHaveLength(0);
    });

    test('labels override the copy', () => {
      render(
        <Rating
          label="Qualité"
          readOnly
          value={3}
          labels={{ value: (v, m) => `${v} sur ${m}` }}
        />,
      );
      expect(
        screen.getByRole('img', { name: 'Qualité, 3 sur 5' }),
      ).toBeTruthy();
    });
  });
});
