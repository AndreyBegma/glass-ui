import { describe, expect, mock, test } from 'bun:test';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { type ChatMessage, ChatThread } from './chat-thread';

/*
 * happy-dom has no layout: `scrollHeight` and `clientHeight` are 0 and
 * `scrollTop` is stored as written. The scroller's metrics are stubbed per
 * test, so "at the end" and "scrolled up" are what the test says they are.
 */
function stubMetrics(
  el: HTMLElement,
  scrollHeight: number,
  clientHeight: number,
) {
  Object.defineProperty(el, 'scrollHeight', {
    configurable: true,
    get: () => scrollHeight,
  });
  Object.defineProperty(el, 'clientHeight', {
    configurable: true,
    get: () => clientHeight,
  });
}

const msg = (id: number, body = `Message ${id}`): ChatMessage => ({
  id: String(id),
  author: id % 2 ? 'Orchestrator' : 'Backend Agent',
  time: `10:2${id} AM`,
  body,
});

const many = (count: number) =>
  Array.from({ length: count }, (_, i) => msg(i + 1));

const log = () => screen.getByRole('log');

describe('ChatThread', () => {
  test('draws each message with its author, time and body, in a polite log', () => {
    render(<ChatThread messages={many(2)} />);
    expect(log().getAttribute('aria-label')).toBe('Messages');
    expect(screen.getAllByRole('listitem').length).toBe(2);
    expect(screen.getByText('Message 1')).not.toBeNull();
    expect(screen.getByText('Backend Agent')).not.toBeNull();
    expect(screen.getByText('10:21 AM').tagName).toBe('TIME');
  });

  test('the body is text: markup in it is never parsed', () => {
    const { container } = render(
      <ChatThread
        messages={[msg(1, '<img src=x onerror=alert(1)><b>bold</b>')]}
      />,
    );
    expect(container.querySelector('[data-chat-body] img')).toBeNull();
    expect(container.querySelector('[data-chat-body] b')).toBeNull();
    expect(container.querySelector('[data-chat-body]')?.textContent).toBe(
      '<img src=x onerror=alert(1)><b>bold</b>',
    );
  });

  test('renderBody replaces the default body', () => {
    render(
      <ChatThread
        messages={[msg(1, 'raw')]}
        renderBody={(m) => (
          <strong data-testid="rich">{m.body.toUpperCase()}</strong>
        )}
      />,
    );
    expect(screen.getByTestId('rich').textContent).toBe('RAW');
    expect(screen.queryByText('raw')).toBeNull();
  });

  test('a message carries a task: a bar while running, a check when done', () => {
    const { container } = render(
      <ChatThread
        messages={[
          {
            ...msg(1),
            progress: { label: 'Task in progress', value: 45, hint: '45%' },
          },
          {
            ...msg(2),
            progress: { label: 'Task complete', value: 100, done: true },
          },
        ]}
      />,
    );
    expect(
      container.querySelector(
        '[data-chat-task="running"] [role="progressbar"]',
      ),
    ).not.toBeNull();
    const done = container.querySelector('[data-chat-task="done"]');
    expect(done?.textContent).toContain('Task complete');
    expect(done?.querySelector('[role="progressbar"]')).toBeNull();
  });

  test('at the end, a new message keeps it at the end and shows no chip', () => {
    const { rerender, container } = render(<ChatThread messages={many(3)} />);
    stubMetrics(log(), 1_000, 400);
    log().scrollTop = 600;
    fireEvent.scroll(log());
    rerender(<ChatThread messages={many(4)} />);
    expect(log().scrollTop).toBe(1_000);
    expect(container.querySelector('[data-chat-new]')).toBeNull();
  });

  test('scrolled up, new messages stay put and are counted in a chip that catches up', () => {
    const { rerender, container } = render(<ChatThread messages={many(3)} />);
    stubMetrics(log(), 1_000, 400);
    log().scrollTop = 100;
    fireEvent.scroll(log());
    rerender(<ChatThread messages={many(4)} />);
    rerender(<ChatThread messages={many(6)} />);
    expect(log().scrollTop).toBe(100);
    const chip = screen.getByRole('button', { name: /3 new/ });
    const scrollTo = mock();
    log().scrollTo = scrollTo;
    fireEvent.click(chip);
    // Catching up is the one deliberate jump, so it is smooth when motion is allowed.
    expect(scrollTo).toHaveBeenCalledWith({ top: 1_000, behavior: 'smooth' });
    expect(container.querySelector('[data-chat-new]')).toBeNull();
  });

  test('scrolling back to the end clears the chip', () => {
    const { rerender, container } = render(<ChatThread messages={many(3)} />);
    stubMetrics(log(), 1_000, 400);
    log().scrollTop = 0;
    fireEvent.scroll(log());
    rerender(<ChatThread messages={many(4)} />);
    expect(container.querySelector('[data-chat-new]')).not.toBeNull();
    log().scrollTop = 590;
    fireEvent.scroll(log());
    expect(container.querySelector('[data-chat-new]')).toBeNull();
  });

  test('labels override the strings it writes', () => {
    const { rerender } = render(
      <ChatThread
        messages={many(1)}
        labels={{ log: 'Чат', newMessages: (n) => `${n} нових` }}
      />,
    );
    stubMetrics(log(), 1_000, 400);
    log().scrollTop = 0;
    fireEvent.scroll(log());
    rerender(
      <ChatThread
        messages={many(2)}
        labels={{ log: 'Чат', newMessages: (n) => `${n} нових` }}
      />,
    );
    expect(log().getAttribute('aria-label')).toBe('Чат');
    expect(screen.getByRole('button', { name: /1 нових/ })).not.toBeNull();
  });

  test('the composer sends, and sending returns the thread to the end', () => {
    const onSubmit = mock();
    const { rerender, container } = render(
      <ChatThread
        messages={many(2)}
        composer={{ onSubmit, placeholder: 'Message' }}
      />,
    );
    stubMetrics(log(), 1_000, 400);
    log().scrollTop = 0;
    fireEvent.scroll(log());
    const field = screen.getByRole('textbox', { name: 'Message' });
    fireEvent.change(field, { target: { value: 'hello' } });
    act(() => {
      fireEvent.keyDown(field, { key: 'Enter' });
    });
    expect(onSubmit).toHaveBeenCalledWith('hello');
    rerender(
      <ChatThread
        messages={many(3)}
        composer={{ onSubmit, placeholder: 'Message' }}
      />,
    );
    expect(log().scrollTop).toBe(1_000);
    expect(container.querySelector('[data-chat-new]')).toBeNull();
  });

  test('composer null is a read-only thread; empty replaces an empty list', () => {
    render(
      <ChatThread
        messages={[]}
        composer={null}
        empty={<p>No messages yet</p>}
      />,
    );
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByText('No messages yet')).not.toBeNull();
  });
});
