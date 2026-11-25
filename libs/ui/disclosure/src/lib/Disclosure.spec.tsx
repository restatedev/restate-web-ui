import { act, render, screen } from '@testing-library/react';
import { Disclosure, DisclosurePanel, DisclosureTrigger } from './Disclosure';

describe('Disclosure', () => {
  it('opens its panel from the trigger', () => {
    render(
      <Disclosure>
        <DisclosureTrigger>Error details</DisclosureTrigger>
        <DisclosurePanel>Connection refused</DisclosurePanel>
      </Disclosure>,
    );
    const trigger = screen.getByRole('button', { name: 'Error details' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    act(() => trigger.click());
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Connection refused')).toBeTruthy();
  });

  it('follows the open prop', () => {
    const { rerender } = render(
      <Disclosure open={false}>
        <DisclosureTrigger variant="inline">Details</DisclosureTrigger>
        <DisclosurePanel>Panel</DisclosurePanel>
      </Disclosure>,
    );
    const trigger = screen.getByRole('button', { name: 'Details' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    rerender(
      <Disclosure open>
        <DisclosureTrigger variant="inline">Details</DisclosureTrigger>
        <DisclosurePanel>Panel</DisclosurePanel>
      </Disclosure>,
    );
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('keeps a disabled disclosure closed', () => {
    render(
      <Disclosure disabled>
        <DisclosureTrigger>Error details</DisclosureTrigger>
        <DisclosurePanel>Connection refused</DisclosurePanel>
      </Disclosure>,
    );
    const trigger = screen.getByRole('button', { name: 'Error details' });
    expect(trigger.hasAttribute('disabled')).toBe(true);
    act(() => trigger.click());
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
});
