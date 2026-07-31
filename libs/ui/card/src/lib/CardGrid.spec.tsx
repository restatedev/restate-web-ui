import { render } from '@testing-library/react';
import { CardGrid } from './CardGrid';

describe('CardGrid', () => {
  it('applies the 5-4-2 distribution at the three-column breakpoint', () => {
    const { container } = render(
      <CardGrid distribution="5-4-2">
        <div>Lock</div>
        <div>Statistics</div>
        <div>State</div>
      </CardGrid>,
    );

    expect(container.firstElementChild?.getAttribute('class')).toContain(
      'xl:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,2fr)]',
    );
  });
});
