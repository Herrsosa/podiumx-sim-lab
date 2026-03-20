import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MOBILE_TAB_KEYS,
  shouldUseMobileAccordion,
  isDesktopViewport,
} from '../src/pages/MyAthlete/mobile/mobile-config.js';

test('mobile tabs maintain expected ordering', () => {
  assert.deepEqual(MOBILE_TAB_KEYS, ['overview', 'chart', 'trades', 'posts', 'globe', 'dm']);
});

test('accordion is enabled below tablet breakpoint', () => {
  assert.equal(shouldUseMobileAccordion(375), true);
  assert.equal(shouldUseMobileAccordion(767), true);
  assert.equal(shouldUseMobileAccordion(768), false);
});

test('desktop viewport detection aligns with breakpoint', () => {
  assert.equal(isDesktopViewport(1024), true);
  assert.equal(isDesktopViewport(768), true);
  assert.equal(isDesktopViewport(767), false);
});
