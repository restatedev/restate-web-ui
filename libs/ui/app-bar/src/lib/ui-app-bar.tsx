import styled from 'tailwind';

/* eslint-disable-next-line */
export interface UiAppBarProps {}

const StyledUiAppBar = styled.div`
  color: pink;
`;

export function UiAppBar(props: UiAppBarProps) {
  return (
    <StyledUiAppBar>
      <h1>Welcome to UiAppBar!</h1>
    </StyledUiAppBar>
  );
}

export default UiAppBar;
