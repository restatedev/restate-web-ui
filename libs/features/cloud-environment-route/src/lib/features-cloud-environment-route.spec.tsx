import { render } from '@testing-library/react';

import FeaturesCloudEnvironmentRoute from './features-cloud-environment-route';

describe('FeaturesCloudEnvironmentRoute', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<FeaturesCloudEnvironmentRoute />);
    expect(baseElement).toBeTruthy();
  });
});
