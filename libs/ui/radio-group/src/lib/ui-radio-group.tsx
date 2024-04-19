import styled from 'tailwind';

/* eslint-disable-next-line */
export interface UiRadioGroupProps {}

const StyledUiRadioGroup = styled.div`
  color: pink;
`;

export function UiRadioGroup(props: UiRadioGroupProps) {
  return (
    <StyledUiRadioGroup>
      <h1>Welcome to UiRadioGroup!</h1>
    </StyledUiRadioGroup>
  );
}

export default UiRadioGroup;
