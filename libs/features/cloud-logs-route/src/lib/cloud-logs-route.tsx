import styled from 'tailwind';

/* eslint-disable-next-line */
export interface CloudLogsRouteProps {}

const StyledCloudLogsRoute = styled.div`
  color: pink;
`;

export function CloudLogsRoute(props: CloudLogsRouteProps) {
  return (
    <StyledCloudLogsRoute>
      <h1>Welcome to CloudLogsRoute!</h1>
    </StyledCloudLogsRoute>
  );
}

export default CloudLogsRoute;
