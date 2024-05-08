import { render } from '@testing-library/react';

import CloudLogsRoute from './cloud-logs-route';

describe('CloudLogsRoute', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<CloudLogsRoute />);
    expect(baseElement).toBeTruthy();
  });
});
