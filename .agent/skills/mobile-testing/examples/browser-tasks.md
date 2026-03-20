# Mobile Test Examples

## Example 1: Marketplace Mobile Grid Test

**Browser Task:**
```
Navigate to http://localhost:8080/marketplace.

First, resize the browser to mobile viewport 390x844 (iPhone 12).

Wait for the page to load completely (wait for at least one athlete card to appear).

Verify the following:
1. The page has a 2-column grid of athlete cards
2. There is no horizontal scroll (document.documentElement.scrollWidth <= document.documentElement.clientWidth)
3. The bottom navigation bar is visible

Take a screenshot and return the path to it.

Report any issues you find.
```

**Recording Name:** `mobile_marketplace_test`

---

## Example 2: Athlete Detail Mobile Action Bar Test

**Browser Task:**
```
Navigate to http://localhost:8080/athlete/max-striker.

Resize the browser to mobile viewport 390x844 (iPhone 12).

Wait for the page to load (profile header should be visible).

Verify:
1. Mobile action bar is visible at the bottom of the viewport
2. Buy button is present and appears tappable
3. Sell button is present and appears tappable
4. The buttons look large enough for touch (at least 44px height)

Click the Buy button and verify that a trade modal or section appears.

Take a screenshot before and after clicking Buy.

Return the screenshot paths and report any issues.
```

**Recording Name:** `mobile_athlete_trade`

---

## Example 3: Own Profile Mobile Test (No Trade Buttons)

**Browser Task:**
```
Navigate to http://localhost:8080/my-athlete.

Resize the browser to mobile viewport 390x844 (iPhone 12).

Wait for the page to load.

Verify:
1. NO Buy or Sell buttons are visible anywhere on the page
2. A Share button IS visible
3. The correct creation CTA is visible for the active profile type
4. If the profile is human, "Add Proof of Sweat" is visible
5. If the profile is agent, "Add Proof of Contribution" is visible
6. Inner Circle card is present
7. No horizontal scroll

Take a screenshot and report findings.
```

**Recording Name:** `mobile_own_profile`

---

## Example 4: Proof Of Contribution Feed Card

**Browser Task:**
```
Navigate to http://localhost:8080/feed.

Resize the browser to mobile viewport 390x844.

Wait for the feed to load.

Find a Proof of Contribution card.

Verify:
1. The card is visually distinct from Proof of Sweat cards
2. A Proof of Contribution badge is visible
3. Category and verification chips are visible
4. At least one evidence preview or artifact count is visible
5. Expanding the card reveals workflow/evidence details without layout breakage

Take a screenshot and report any issues.
```

**Recording Name:** `mobile_contribution_card`

---

## Example 5: Full Mobile Navigation Flow

**Browser Task:**
```
Test the mobile navigation flow at 390x844 viewport.

1. Navigate to http://localhost:8080/marketplace
2. Wait for page load
3. Take a screenshot named "1_marketplace"
4. Click on the first athlete card
5. Wait for athlete detail page to load
6. Take a screenshot named "2_athlete_detail"
7. Click the "Portfolio" tab in the bottom navigation
8. Wait for portfolio page to load
9. Take a screenshot named "3_portfolio"
10. Click the "Profile" tab in the bottom navigation
11. Wait for my-athlete page to load
12. Take a screenshot named "4_my_athlete"

Report the navigation worked correctly and note any issues.
Return the paths to all screenshots.
```

**Recording Name:** `mobile_nav_flow`

---

## Example 6: Touch Target Size Audit

**Browser Task:**
```
Navigate to http://localhost:8080/marketplace at 390x844 viewport.

Wait for page load.

Identify all buttons and tappable elements on the page.

For each button or tappable element:
- Determine its height in pixels
- Note if it is below 44px (violates Apple HIG)

List any elements that are too small to tap easily.

Take a screenshot highlighting the bottom navigation buttons.
```

**Recording Name:** `touch_target_audit`

---

## Example 7: Horizontal Scroll Detection

**Browser Task:**
```
Test for horizontal scroll issues across mobile viewports.

For each viewport:
- 360x800 (Galaxy S21)
- 390x844 (iPhone 12)
- 430x932 (iPhone 14 Pro Max)

Navigate to http://localhost:8080/marketplace.
Check if there's horizontal scroll by evaluating:
document.documentElement.scrollWidth > document.documentElement.clientWidth

Navigate to http://localhost:8080/athlete/max-striker.
Check for horizontal scroll.

Report any viewport+page combinations that have horizontal scroll.
```

**Recording Name:** `horizontal_scroll_check`
