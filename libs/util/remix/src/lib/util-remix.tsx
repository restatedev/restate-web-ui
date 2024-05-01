import styled from 'tailwind';

/* eslint-disable-next-line */
export interface UtilRemixProps {}

const StyledUtilRemix = styled.div`
  color: pink;
`;

export function UtilRemix(props: UtilRemixProps) {
  return (
    <StyledUtilRemix>
      <h1>Welcome to UtilRemix!</h1>
    </StyledUtilRemix>
  );
}

export default UtilRemix;
