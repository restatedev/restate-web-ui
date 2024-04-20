import styled from 'tailwind';

/* eslint-disable-next-line */
export interface CloudEnvironmentSettingsProps {}

const StyledCloudEnvironmentSettings = styled.div`
  color: pink;
`;

export function CloudEnvironmentSettings(props: CloudEnvironmentSettingsProps) {
  return (
    <StyledCloudEnvironmentSettings>
      <h1>Welcome to CloudEnvironmentSettings!</h1>
    </StyledCloudEnvironmentSettings>
  );
}

export default CloudEnvironmentSettings;
