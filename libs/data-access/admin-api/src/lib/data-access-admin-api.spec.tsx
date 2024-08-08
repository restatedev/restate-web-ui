import { render } from '@testing-library/react';

import DataAccessAdminApi from './data-access-admin-api';

describe('DataAccessAdminApi', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<DataAccessAdminApi />);
    expect(baseElement).toBeTruthy();
  });
});
