import { render } from '@testing-library/react';

import UiRadioGroup from './ui-radio-group';

describe('UiRadioGroup', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<UiRadioGroup />);
    expect(baseElement).toBeTruthy();
  });
});
