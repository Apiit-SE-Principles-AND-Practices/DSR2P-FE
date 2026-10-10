export interface NavItem {
  path: string;
  label: string;
}

/** Primary destinations shared by TopNav and BottomTabBar. Labels move to i18n keys in DSR2P-26. */
export const NAV_ITEMS: readonly NavItem[] = [
  { path: '/', label: 'Home' },
  { path: '/search', label: 'Search' },
  { path: '/login', label: 'Login' },
];
