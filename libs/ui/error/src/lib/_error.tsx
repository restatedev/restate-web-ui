import styled from 'tailwind';

/* eslint-disable-next-line */
export interface ErrorProps {}

const StyledError = styled.div`
  color: pink;
`;

export function Error(props: ErrorProps) {
  return (
    <StyledError>
      <h1>Welcome to Error!</h1>
    </StyledError>
  );
}

export default Error;
