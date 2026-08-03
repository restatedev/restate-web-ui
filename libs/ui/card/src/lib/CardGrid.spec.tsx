import { render } from '@testing-library/react';
import { CardGrid } from './CardGrid';

describe('CardGrid', () => {
  it('spans the primary card at two columns and applies the 5-4-2 distribution at three columns', () => {
    const { container } = render(
      <CardGrid distribution="5-4-2">
        <div>Lock</div>
        <div>Statistics</div>
        <div>State</div>
      </CardGrid>,
    );

    const className = container.firstElementChild?.getAttribute('class');
    expect(className).toContain('md:[&>*:first-child]:col-span-2');
    expect(className).toContain('xl:[&>*:first-child]:col-span-1');
    expect(className).toContain(
      'xl:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_minmax(0,2fr)]',
    );
  });
});
