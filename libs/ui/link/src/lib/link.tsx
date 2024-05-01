import styled from 'tailwind';

/* eslint-disable-next-line */
export interface LinkProps {}

const StyledLink = styled.div`
  color: pink;
`;

export function Link(props: LinkProps) {
  return (
    <StyledLink>
      <h1>Welcome to Link!</h1>
    </StyledLink>
  );
}

export default Link;
