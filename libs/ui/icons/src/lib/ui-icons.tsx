import styled from 'tailwind';

/* eslint-disable-next-line */
export interface UiIconsProps {}

const StyledUiIcons = styled.div`
  color: pink;
`;

export function UiIcons(props: UiIconsProps) {
  return (
    <StyledUiIcons>
      <h1>Welcome to UiIcons!</h1>
    </StyledUiIcons>
  );
}

export default UiIcons;
