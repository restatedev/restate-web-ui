import { render } from '@testing-library/react';

import Notification from './notification';

describe('Notification', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<Notification />);
    expect(baseElement).toBeTruthy();
  });
});
