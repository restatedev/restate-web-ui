import { render } from '@testing-library/react';

import RemixActionError from './remix-action-error';

describe('RemixActionError', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<RemixActionError />);
    expect(baseElement).toBeTruthy();
  });
});
