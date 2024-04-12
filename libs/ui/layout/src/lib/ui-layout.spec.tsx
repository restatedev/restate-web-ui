import { render } from '@testing-library/react';

import UiLayout from './ui-layout';

describe('UiLayout', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<UiLayout />);
    expect(baseElement).toBeTruthy();
  });
});
