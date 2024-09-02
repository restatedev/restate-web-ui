import { render } from '@testing-library/react';

import UtilFeatureFlag from './util-feature-flag';

describe('UtilFeatureFlag', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<UtilFeatureFlag />);
    expect(baseElement).toBeTruthy();
  });
});
