// Modal dialogs whose content is currently mounted. The shared DialogContent
// registers itself while open (React Aria only mounts modal content while the
// overlay is shown), so this reflects every dialog in the app — including
// local-state ones that leave no trace in the URL. The query-stats recorder
// reads it to attribute queries to the surface that was open when they fired.
const openDialogSurfaces: string[] = [];

export const ANONYMOUS_DIALOG_SURFACE = 'dialog';

export function markDialogSurfaceOpen(
  name = ANONYMOUS_DIALOG_SURFACE,
): () => void {
  openDialogSurfaces.push(name);
  return () => {
    const index = openDialogSurfaces.indexOf(name);
    if (index >= 0) {
      openDialogSurfaces.splice(index, 1);
    }
  };
}

export function getOpenDialogSurfaces(): string[] {
  return [...new Set(openDialogSurfaces)];
}
