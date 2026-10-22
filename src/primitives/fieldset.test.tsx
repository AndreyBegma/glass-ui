import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import { ErrorSummary, Fieldset, FormSection } from './fieldset';

describe('Fieldset', () => {
  test('renders a real fieldset with a legend', () => {
    const { container } = render(<Fieldset legend="Address">x</Fieldset>);
    expect(container.querySelector('fieldset > legend')?.textContent).toBe(
      'Address',
    );
  });

  test.todo('disabled propagates to the fields');
  test.todo('describedby wiring');
});

describe('FormSection', () => {
  test('renders', () => {
    const { container } = render(<FormSection title="Profile">x</FormSection>);
    expect(container.textContent).toContain('Profile');
  });
});

describe('ErrorSummary', () => {
  test('renders one item per error', () => {
    const { container } = render(
      <ErrorSummary errors={[{ fieldId: 'email', message: 'Required' }]} />,
    );
    expect(container.querySelectorAll('li').length).toBe(1);
  });

  test.todo('focus moves to the summary when it appears');
  test.todo('clicking an item focuses the field');
});
