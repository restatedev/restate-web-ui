import styled from 'tailwind';

/* eslint-disable-next-line */
export interface UiMenuProps {}

const StyledUiMenu = styled.div`
  color: pink;
`;

export function UiMenu(props: UiMenuProps) {
  return (
    <StyledUiMenu>
      <h1>Welcome to UiMenu!</h1>
    </StyledUiMenu>
  );
}

export default UiMenu;
