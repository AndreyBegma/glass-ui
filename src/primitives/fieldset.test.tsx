import { describe, expect, test } from 'bun:test';
import { fireEvent, render } from '@testing-library/react';
import { ErrorSummary, Fieldset, FormSection } from './fieldset';

describe('Fieldset', () => {
  test('renders a real fieldset with a legend', () => {
    const { container } = render(<Fieldset legend="Address">x</Fieldset>);
    expect(container.querySelector('fieldset > legend')?.textContent).toBe('Address');
  });

  test('disabled propagates to the fields', () => {
    const { container } = render(
      <Fieldset legend="Address" disabled>
        <input id="a" />
        <select id="b" />
        <button type="button">go</button>
      </Fieldset>,
    );
    // The browser disables every control under a disabled fieldset; happy-dom
    // does not compute that, so assert the fieldset's own state and that each
    // control sits under it (outside its first legend).
    const fieldset = container.querySelector('fieldset') as HTMLFieldSetElement;
    expect(fieldset.disabled).toBe(true);
    const controls = container.querySelectorAll('input, select, button');
    expect(controls.length).toBe(3);
    for (const el of controls) {
      expect(el.closest('fieldset:disabled')).toBe(fieldset);
    }
  });

  test('enabled leaves the fields enabled', () => {
    const { container } = render(
      <Fieldset legend="Address">
        <input />
      </Fieldset>,
    );
    expect(container.querySelector('fieldset')?.disabled).toBe(false);
    expect(container.querySelector('input')?.disabled).toBe(false);
  });

  test('describedby names the description and the error', () => {
    const { container } = render(
      <Fieldset legend="Address" description="Where we post" error="Pick one">
        x
      </Fieldset>,
    );
    const fieldset = container.querySelector('fieldset');
    const ids = (fieldset?.getAttribute('aria-describedby') ?? '').split(' ');
    expect(ids.length).toBe(2);
    const texts = ids.map((id) => document.getElementById(id)?.textContent);
    expect(texts).toEqual(['Where we post', 'Pick one']);
  });

  test('describedby is absent with neither, and lists only what exists', () => {
    const none = render(<Fieldset legend="A">x</Fieldset>);
    expect(none.container.querySelector('fieldset')?.hasAttribute('aria-describedby')).toBe(false);
    none.unmount();
    const err = render(
      <Fieldset legend="A" error="Bad">
        x
      </Fieldset>,
    );
    const ids = err.container.querySelector('fieldset')?.getAttribute('aria-describedby') ?? '';
    expect(ids.split(' ').length).toBe(1);
    expect(document.getElementById(ids)?.textContent).toBe('Bad');
  });

  test('the error carries an icon, not only a colour', () => {
    const { container } = render(
      <Fieldset legend="A" error="Bad">
        x
      </Fieldset>,
    );
    expect(container.querySelector('[role="alert"] svg')).not.toBeNull();
  });
});

describe('FormSection', () => {
  test('renders title, description, aside and children', () => {
    const { container } = render(
      <FormSection title="Profile" description="Public info" aside={<a href="/help">Help</a>}>
        <input />
      </FormSection>,
    );
    expect(container.textContent).toContain('Profile');
    expect(container.textContent).toContain('Public info');
    expect(container.querySelector('a[href="/help"]')).not.toBeNull();
    expect(container.querySelector('input')).not.toBeNull();
  });

  test('is a labelled region with a separator', () => {
    const { container } = render(<FormSection title="Profile">x</FormSection>);
    const section = container.querySelector('section');
    const labelId = section?.getAttribute('aria-labelledby') ?? '';
    expect(document.getElementById(labelId)?.textContent).toBe('Profile');
    expect(container.querySelector('[role="separator"]')).not.toBeNull();
  });
});

describe('ErrorSummary', () => {
  const errors = [
    { fieldId: 'email', message: 'Email is required' },
    { fieldId: 'name', message: 'Name is required' },
  ];

  test('renders one item per error, as links', () => {
    const { container } = render(<ErrorSummary errors={errors} />);
    expect(container.querySelectorAll('li').length).toBe(2);
    expect(container.querySelector('a[href="#email"]')?.textContent).toBe('Email is required');
  });

  test('renders nothing when empty', () => {
    const { container } = render(<ErrorSummary errors={[]} />);
    expect(container.innerHTML).toBe('');
  });

  test('is an alert with a default title and a labels override', () => {
    const { container, rerender } = render(<ErrorSummary errors={errors} />);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('There is a problem');
    rerender(<ErrorSummary errors={errors} labels={{ title: 'Problème' }} />);
    expect(container.textContent).toContain('Problème');
  });

  test('focus moves to the summary when it appears, once per change', () => {
    const { container, rerender } = render(<ErrorSummary errors={[]} />);
    rerender(<ErrorSummary errors={errors} />);
    const alert = container.querySelector('[role="alert"]') as HTMLElement;
    expect(document.activeElement).toBe(alert);

    const outside = document.createElement('input');
    document.body.appendChild(outside);
    outside.focus();
    rerender(<ErrorSummary errors={[...errors]} />);
    expect(document.activeElement).toBe(outside);

    rerender(<ErrorSummary errors={[errors[0] as (typeof errors)[number]]} />);
    expect(document.activeElement).toBe(alert);
    outside.remove();
  });

  test('clicking an item focuses the field', () => {
    const field = document.createElement('input');
    field.id = 'email';
    document.body.appendChild(field);
    const { container } = render(<ErrorSummary errors={errors} />);
    fireEvent.click(container.querySelector('a[href="#email"]') as HTMLElement);
    expect(document.activeElement).toBe(field);
    field.remove();
  });
});
