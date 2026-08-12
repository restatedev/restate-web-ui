import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Chip, ChipGroup, ChipSegment } from './Chip';

describe('Chip', () => {
  it('should render segment content', () => {
    render(
      <Chip>
        <ChipSegment>llm</ChipSegment>
        <ChipSegment>*</ChipSegment>
        <ChipSegment>batch</ChipSegment>
      </Chip>,
    );
    expect(screen.getByText('llm')).toBeTruthy();
    expect(screen.getByText('*')).toBeTruthy();
    expect(screen.getByText('batch')).toBeTruthy();
  });

  it('should apply segment className to the segment background element', () => {
    const { container } = render(
      <Chip>
        <ChipSegment className="bg-blue-50">llm</ChipSegment>
      </Chip>,
    );
    const inner = container.querySelector('[data-chip-segment-inner]');
    expect(inner?.className).toContain('bg-blue-50');
  });

  it('should render the whole chip as a link when href is provided', () => {
    render(
      <MemoryRouter>
        <Chip href="/limits" aria-label="llm rule">
          <ChipSegment>llm</ChipSegment>
        </Chip>
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: 'llm rule' });
    expect(link.getAttribute('href')).toBe('/limits');
  });

  it('should not render a link without href', () => {
    render(
      <Chip>
        <ChipSegment>llm</ChipSegment>
      </Chip>,
    );
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('should render a reusable header chip group', () => {
    const { container } = render(
      <ChipGroup variant="header">
        <Chip left="straight" right="angled">
          <ChipSegment>service</ChipSegment>
        </Chip>
        <Chip left="angled" right="straight">
          <ChipSegment>key</ChipSegment>
        </Chip>
      </ChipGroup>,
    );
    const group = container.querySelector('[data-chip-group]');
    expect(group?.className).toContain('mix-blend-luminosity');
    expect(group?.className).toContain('[--chip-radius:0.625rem]');
    expect(group?.className).toContain('[--chip-slope:5px]');
    expect(group?.className).toContain(
      '[&>[data-chip]:not(:first-child)]:-ml-px',
    );
  });

  it('should render compact connected chip groups', () => {
    const { container } = render(
      <ChipGroup density="compact">
        <Chip left="straight" right="angled">
          <ChipSegment>scope</ChipSegment>
        </Chip>
        <Chip left="angled" right="straight">
          <ChipSegment>identity</ChipSegment>
        </Chip>
      </ChipGroup>,
    );
    const group = container.querySelector('[data-chip-group]');
    expect(group?.className).toContain('[--chip-height:1.5rem]');
    expect(group?.className).toContain('[--chip-slope:5px]');
    expect(group?.className).toContain(
      '[&>[data-chip]:not(:first-child)]:-ml-0.5',
    );
  });

  it('should render chip groups without transition or brightness effects', () => {
    const { container } = render(
      <ChipGroup>
        <Chip right="angled">
          <ChipSegment>scope</ChipSegment>
        </Chip>
      </ChipGroup>,
    );
    const group = container.querySelector('[data-chip-group]');
    expect(group?.className).toContain('transition-none');
    expect(group?.className).toContain('hover:brightness-100');
    expect(group?.className).toContain('[&_[data-chip]]:transition-none');
    expect(group?.className).toContain('[&_[data-chip-root]]:transition-none');
  });

  it('should preserve the angled-edge slope across sizes', () => {
    const { container } = render(
      <>
        <Chip size="sm" right="angled">
          <ChipSegment>small</ChipSegment>
        </Chip>
        <Chip size="md" right="angled">
          <ChipSegment>medium</ChipSegment>
        </Chip>
        <Chip size="lg" right="angled">
          <ChipSegment>large</ChipSegment>
        </Chip>
      </>,
    );
    const chips = container.querySelectorAll('[data-chip]');
    expect(chips[0]?.className).toContain('[--chip-height:1.25rem]');
    expect(chips[0]?.className).toContain('[--chip-slope:5px]');
    expect(chips[1]?.className).toContain('[--chip-height:1.5rem]');
    expect(chips[1]?.className).toContain('[--chip-slope:6px]');
    expect(chips[2]?.className).toContain('[--chip-height:1.625rem]');
    expect(chips[2]?.className).toContain('[--chip-slope:6.5px]');
  });

  it('should render angled borders without CSS filters', () => {
    const { container } = render(
      <Chip right="angled">
        <ChipSegment>scope</ChipSegment>
      </Chip>,
    );
    const chip = container.querySelector('[data-chip]');
    const root = container.querySelector('[data-chip-root]');
    expect(chip?.className).toContain('p-px');
    expect(chip?.className).toContain('[clip-path:var(--chip-clip)]');
    expect(chip?.className).toContain(
      '[--chip-inner-radius:calc(var(--chip-radius)-1px)]',
    );
    expect(root?.className).toContain('h-full');
    expect(root?.className).toContain('[clip-path:var(--chip-inner-clip)]');
    expect(chip?.className).not.toContain('filter:drop-shadow');
    expect(root?.className).not.toContain('drop-shadow');
  });

  it('should render the whole chip group as a link when href is provided', () => {
    render(
      <MemoryRouter>
        <ChipGroup href="/objects" aria-label="object target">
          <Chip>
            <ChipSegment>object</ChipSegment>
          </Chip>
        </ChipGroup>
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('link', { name: 'object target' }).getAttribute('href'),
    ).toBe('/objects');
  });
});
