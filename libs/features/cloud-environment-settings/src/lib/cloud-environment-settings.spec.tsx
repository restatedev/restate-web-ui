import { render } from '@testing-library/react';

import CloudEnvironmentSettings from './cloud-environment-settings';

describe('CloudEnvironmentSettings', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<CloudEnvironmentSettings />);
    expect(baseElement).toBeTruthy();
  });
});
