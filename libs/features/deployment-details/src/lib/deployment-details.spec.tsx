import { render } from '@testing-library/react';

import DeploymentDetails from './deployment-details';

describe('DeploymentDetails', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<DeploymentDetails />);
    expect(baseElement).toBeTruthy();
  });
});
