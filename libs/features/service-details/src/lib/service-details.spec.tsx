import { render } from '@testing-library/react';

import ServiceDetails from './service-details';

describe('ServiceDetails', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<ServiceDetails />);
    expect(baseElement).toBeTruthy();
  });
});
