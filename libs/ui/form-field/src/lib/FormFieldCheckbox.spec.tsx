import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('checks the box when its text is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <FormFieldCheckbox name="force" value="true" onChange={onChange}>
        Force the deployment
      </FormFieldCheckbox>,
    );
    await user.click(screen.getByText('Force the deployment'));
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(
      true,
    );
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('leaves the name of a checkbox without children to the page', () => {
    render(<FormFieldCheckbox name="skip" value="true" />);
    expect(screen.getByRole('checkbox').hasAttribute('aria-labelledby')).toBe(
      false,
    );
  });
});
