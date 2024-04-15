import { render } from '@testing-library/react';

import UiMenu from './ui-menu';

describe('UiMenu', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<UiMenu />);
    expect(baseElement).toBeTruthy();
  });
});
