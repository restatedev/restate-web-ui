import { render } from '@testing-library/react';

import FeaturesOverviewRoute from './features-overview-route';

describe('FeaturesOverviewRoute', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<FeaturesOverviewRoute />);
    expect(baseElement).toBeTruthy();
  });
});
