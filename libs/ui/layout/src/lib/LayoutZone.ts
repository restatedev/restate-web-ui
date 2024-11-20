export const enum LayoutZone {
  AppBar = 'AppBar',
  Nav = 'Nav',
  Content = 'Content',
  Complementary = 'Complementary',
  Toolbar = 'Toolbar',
}

export const ZONE_IDS: Record<LayoutZone, string> = {
  [LayoutZone.AppBar]: 'layout-app-bar',
  [LayoutZone.Nav]: 'layout-nav',
  [LayoutZone.Content]: 'layout-content',
  [LayoutZone.Complementary]: 'layout-complementary',
  [LayoutZone.Toolbar]: 'layout-toolbar',
};
