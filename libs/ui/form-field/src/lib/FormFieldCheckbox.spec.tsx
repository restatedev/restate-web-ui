import { render, screen } from '@testing-library/react';
import { FormFieldCheckbox } from './FormFieldCheckbox';

describe('FormFieldCheckbox', () => {
  it('names the checkbox and its group after the label', () => {
    render(
      <FormFieldCheckbox name="force" value="true">
        Force the deployment
      </FormFieldCheckbox>,
    );
    expect(
      screen.getByRole('checkbox', { name: 'Force the deployment' }),
    ).toBeTruthy();
    expect(
      screen.getByRole('group', { name: 'Force the deployment' }),
    ).toBeTruthy();
  });

  it('leaves the name of a checkbox without children to the page', () => {
    render(<FormFieldCheckbox name="skip" value="true" />);
    expect(screen.getByRole('checkbox').hasAttribute('aria-labelledby')).toBe(
      false,
    );
  });
});
