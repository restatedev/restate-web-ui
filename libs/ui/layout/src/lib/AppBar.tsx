interface AppBarProps {
  id?: string;
}

export function AppBar(props: AppBarProps) {
  return (
    <header
      {...props}
      className={
        'sticky top-0 z-50 flex flex-none flex-wrap items-center justify-between bg-white px-4 py-5 shadow-md shadow-slate-900/5 transition duration-500 sm:px-6 lg:px-8 dark:shadow-none dark:bg-slate-900/95 dark:backdrop-blur dark:[@supports(backdrop-filter:blur(0))]:bg-slate-900/75'
      }
    />
  );
}
