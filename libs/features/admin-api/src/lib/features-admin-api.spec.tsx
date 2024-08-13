import { render } from '@testing-library/react';

import FeaturesAdminApi from './features-admin-api';

describe('FeaturesAdminApi', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<FeaturesAdminApi />);
    expect(baseElement).toBeTruthy();
  });
});
