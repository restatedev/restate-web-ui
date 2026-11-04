import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TruncateMiddle } from './TruncateMiddle';

describe('TruncateMiddle', () => {
  it('renders the full text split into a shrinkable head and a fixed tail', () => {
    const text = 'inv_1234567890abcdefghijklmnopqrstuv';
    const { container } = render(<TruncateMiddle text={text} />);

    expect(container.textContent).toBe(text);
    expect(
      container.querySelector('[data-truncate-tooltip]')?.textContent,
    ).toBe('inv_1234567890abcdefghijklmnopq');
    expect(container.firstElementChild?.lastElementChild?.textContent).toBe(
      'rstuv',
    );
  });

  it('keeps at least `start` characters before the ellipsis', () => {
    const { container } = render(
      <TruncateMiddle text="vq_0123456789abcdef" start={10} end={3} />,
    );

    expect(
      container.querySelector<HTMLElement>('[data-truncate-tooltip]')
        ?.parentElement?.style.minWidth,
    ).toBe('min(11ch, 100%)');
    expect(container.firstElementChild?.lastElementChild?.textContent).toBe(
      'def',
    );
  });

  it('lowers the head minimum for short text so the tail only drops once the head is cut', () => {
    const { container } = render(<TruncateMiddle text="vq_0123456789ab" />);

    expect(
      container.querySelector<HTMLElement>('[data-truncate-tooltip]')
        ?.parentElement?.style.minWidth,
    ).toBe('min(5ch, 100%)');
  });

  it('renders short text as is', () => {
    const { container } = render(<TruncateMiddle text="inv_12345678" />);

    expect(container.textContent).toBe('inv_12345678');
    expect(container.querySelector('[data-truncate-tooltip]')).toBeNull();
  });
});
