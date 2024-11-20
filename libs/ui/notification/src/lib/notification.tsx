import styled from 'tailwind';

const StyledNotification = styled.div`
  color: pink;
`;

export function Notification() {
  return (
    <StyledNotification>
      <h1>Welcome to Notification!</h1>
    </StyledNotification>
  );
}

export default Notification;
