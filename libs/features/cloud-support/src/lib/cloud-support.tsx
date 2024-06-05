import styled from 'tailwind';

/* eslint-disable-next-line */
export interface CloudSupportProps {}

const StyledCloudSupport = styled.div`
  color: pink;
`;

export function CloudSupport(props: CloudSupportProps) {
  return (
    <StyledCloudSupport>
      <h1>Welcome to CloudSupport!</h1>
    </StyledCloudSupport>
  );
}

export default CloudSupport;
