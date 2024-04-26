interface AppBarProps {
  id?: string;
}

export function AppBar(props: AppBarProps) {
  return (
    <header
      {...props}
      className={
        'sticky top-0 z-50 flex flex-none flex-wrap items-center justify-between px-4 py-5  sm:px-6 lg:px-8'
      }
    />
  );
}
