import { render } from '@testing-library/react';

import DataAccessAdminApi2 from './data-access-admin-api-2';

describe('DataAccessAdminApi2', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<DataAccessAdminApi2 />);
    expect(baseElement).toBeTruthy();
  });
});
