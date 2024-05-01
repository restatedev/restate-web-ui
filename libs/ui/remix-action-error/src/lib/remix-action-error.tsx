import styled from 'tailwind';

/* eslint-disable-next-line */
export interface RemixActionErrorProps {}

const StyledRemixActionError = styled.div`
  color: pink;
`;

export function RemixActionError(props: RemixActionErrorProps) {
  return (
    <StyledRemixActionError>
      <h1>Welcome to RemixActionError!</h1>
    </StyledRemixActionError>
  );
}

export default RemixActionError;
