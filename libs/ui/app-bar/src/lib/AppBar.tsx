/* eslint-disable-next-line */
export interface AppBarProps {}

export function AppBar(props: AppBarProps) {
  return (
    <>
      <nav>
        <a>Services</a>
        <a>Deployments</a>
        <a>Invocations</a>
        <a>Workflows</a>
      </nav>
      <header>
        <div>
          <h1>Dashboard</h1>
        </div>
      </header>
    </>
  );
}
