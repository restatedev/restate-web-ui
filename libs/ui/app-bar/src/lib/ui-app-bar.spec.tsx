import { render } from '@testing-library/react';

import UiAppBar from './ui-app-bar';

describe('UiAppBar', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<UiAppBar />);
    expect(baseElement).toBeTruthy();
  });
});
