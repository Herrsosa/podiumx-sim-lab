export const MOBILE_TAB_KEYS = ['overview', 'chart', 'trades', 'posts', 'dm'];

export function shouldUseMobileAccordion(width) {
  return width < 768;
}

export function isDesktopViewport(width) {
  return width >= 768;
}
