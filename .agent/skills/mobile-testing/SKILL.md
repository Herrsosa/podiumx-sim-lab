---
name: mobile-testing
description: Run mobile-first visual and functional tests using the browser tool in mobile viewport
---

# Mobile-First Testing Skill

Test Athlyst pages in mobile viewport to catch responsive issues, verify mobile UX, and capture screenshots for visual comparison.

## When to Use This Skill

- After making UI changes to verify mobile responsiveness
- When debugging mobile-specific bugs
- To visually audit mobile layouts before deployment
- When the user asks to "test mobile", "check on mobile", or "mobile QA"

## Prerequisites

- Dev server running at `http://localhost:8080` (or configured port)
- If not running, start with: `npm run dev`

## Mobile Viewports

Use these standard viewports for testing:

| Device | Width | Height |
|--------|-------|--------|
| iPhone SE | 375 | 667 |
| iPhone 12/13 | 390 | 844 |
| iPhone 14 Pro Max | 430 | 932 |
| Pixel 5 | 393 | 851 |
| Galaxy S21 | 360 | 800 |

**Default viewport**: iPhone 12 (390×844)

## Key Routes to Test

### Public Routes (no auth required)
- `/` - Landing page
- `/marketplace` - Athlete discovery (2-column grid on mobile)
- `/athlete/:slug` - Athlete detail (e.g., `/athlete/max-striker`)

### Protected Routes (requires auth)
- `/portfolio` - User's portfolio
- `/my-athlete` or `/my-athlete/overview` - Own athlete profile
- `/my-athlete/locker` - Locker/Inner Circle
- `/feed` - Proof of Sweat feed
- `/notifications` - Notifications
- `/watchlist` - Watchlist

## Quick Test Procedures

### 1. Visual Spot Check (Any Page)

Use the browser_subagent to:
1. Navigate to the target URL
2. Wait for content to load (network idle or specific element)
3. Capture a screenshot
4. Check for:
   - No horizontal scroll (scrollWidth ≤ clientWidth)
   - Bottom navigation visible
   - Content not cut off

**Example browser task:**
```
Navigate to http://localhost:8080/marketplace on iPhone 12 viewport (390x844).
Wait for the page to fully load.
Verify there is no horizontal scroll.
Take a screenshot and return the path.
```

### 2. Mobile Navigation Test

Test the bottom tab bar navigation:
1. Navigate to `/marketplace`
2. Tap "Portfolio" tab → verify `/portfolio` loads
3. Tap "Profile" tab → verify `/my-athlete` loads
4. Tap "Market" tab → verify `/marketplace` loads

### 3. Mobile Marketplace Grid Test

Verify the 2-column athlete grid:
1. Navigate to `/marketplace`
2. Check that athlete cards are in 2-column layout
3. Verify the activity icon is in header (opens bottom sheet)
4. Check filter/sort bar is not overflowing

### 4. Mobile Athlete Profile Test

For viewing another athlete:
1. Navigate to `/athlete/{slug}`
2. Verify mobile action bar is visible at bottom
3. Check Buy/Sell buttons are tappable (≥44px height)
4. Verify Inner Circle card shows locked state

For own profile:
1. Navigate to `/my-athlete`
2. Verify NO Buy/Sell buttons are shown
3. Check for Share button presence
4. Verify "Add Proof of Sweat" CTA is visible

### 5. Touch Target Size Audit

All interactive elements should be ≥44px (Apple HIG):
1. Navigate to the page
2. Identify all buttons, links, and tappable areas
3. Verify each has min dimensions of 44x44px

### 6. Safe Area / Bottom Navigation Test

Verify content is not hidden by bottom nav:
1. Navigate to a long scrollable page
2. Scroll to the very bottom
3. Verify last content item is visible above bottom nav
4. Check for `pb-[env(safe-area-inset-bottom)]` padding

## Common Mobile Issues to Check

| Issue | How to Detect |
|-------|---------------|
| Horizontal scroll | `document.documentElement.scrollWidth > document.documentElement.clientWidth` |
| Text truncation | Visually inspect or check for `text-overflow: ellipsis` issues |
| Touch targets too small | Measure button/link dimensions (<44px) |
| Bottom content cut off | Last item hidden by bottom nav |
| Viewport issues | Content overflowing body width |
| Z-index conflicts | Elements covering the sticky bottom bar |

## Recording Names for Tests

Use descriptive recording names when running browser tests:
- `mobile_marketplace_grid`
- `mobile_athlete_detail`
- `mobile_own_profile`
- `mobile_nav_flow`
- `mobile_trade_flow`
- `mobile_feed_scroll`

## Example: Full Mobile QA Smoke Test

To run a comprehensive mobile smoke test:

1. **Start dev server** (if not running):
   ```bash
   npm run dev
   ```

2. **Test Landing Page** (public):
   - Navigate to `/` at 390x844
   - Verify hero section, "How it works" section visible
   - No horizontal scroll

3. **Test Marketplace** (public):
   - Navigate to `/marketplace`
   - Verify 2-column grid
   - Tap an athlete card → opens athlete detail

4. **Test Athlete Detail** (public):
   - Navigate to `/athlete/max-striker`
   - Verify profile header, market cap card
   - Verify mobile action bar with Buy/Sell/Message buttons

5. **Test Own Profile** (requires auth simulation):
   - Navigate to `/my-athlete`
   - Verify NO Buy/Sell buttons
   - Verify Inner Circle card
   - Verify "Add Proof of Sweat" button

## Integration with Existing Tests

The project already has Playwright tests in `tests/e2e/`:
- `mobile-cta-bar.spec.ts` - Tests mobile action bar
- `mobile-locker-history.spec.ts` - Tests locker on mobile

To run existing Playwright tests:
```bash
npx playwright test tests/e2e/mobile-cta-bar.spec.ts
```

To run all E2E tests:
```bash
npx playwright test
```

## Reporting Results

After testing, summarize findings:

```markdown
## Mobile QA Results

**Device**: iPhone 12 (390×844)
**Routes Tested**: /marketplace, /athlete/max-striker, /my-athlete

### ✅ Passed
- No horizontal scroll on any page
- Bottom navigation visible and tappable
- 2-column grid on marketplace

### ⚠️ Issues Found
- [Page]: [Description of issue]
- [Screenshot path if captured]

### 📸 Screenshots
- /path/to/screenshot1.png
- /path/to/screenshot2.png
```
