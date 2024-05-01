import { render } from '@testing-library/react';

import UtilRemix from './util-remix';

describe('UtilRemix', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<UtilRemix />);
    expect(baseElement).toBeTruthy();
  });
});
