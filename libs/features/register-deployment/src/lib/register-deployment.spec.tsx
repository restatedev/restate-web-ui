import { render } from '@testing-library/react';

import RegisterDeployment from './register-deployment';

describe('RegisterDeployment', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<RegisterDeployment />);
    expect(baseElement).toBeTruthy();
  });
});
