import { render } from '@testing-library/react';

import UiIcons from './ui-icons';

describe('UiIcons', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<UiIcons />);
    expect(baseElement).toBeTruthy();
  });
});
