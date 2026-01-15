# Mobile QA Checklist

Copy this checklist when performing mobile QA and check off items as you verify them.

## Device & Setup
- [ ] Viewport set to mobile dimensions (e.g., 390×844)
- [ ] Dev server running at http://localhost:8080

---

## Landing Page (`/`)
- [ ] Hero section fully visible
- [ ] "How it works" section renders correctly
- [ ] "Trending Athletes" section shows athlete cards
- [ ] No horizontal scroll
- [ ] All CTAs are tappable (≥44px)

## Marketplace (`/marketplace`)
- [ ] 2-column athlete card grid displays
- [ ] Activity icon visible in header
- [ ] Activity overlay opens when tapped
- [ ] Filter/sort bar fits without overflow
- [ ] Athlete cards are tappable
- [ ] No horizontal scroll

## Athlete Detail (`/athlete/:slug`)
- [ ] Profile header (photo, name, sport) visible
- [ ] Market cap card displays correctly
- [ ] Inner Circle card shows locked state (for non-holders)
- [ ] Mobile action bar visible at bottom
- [ ] Buy button tappable (≥44px)
- [ ] Sell button tappable (≥44px)
- [ ] Message button tappable (≥44px)
- [ ] Proof of Sweat feed scrollable
- [ ] No horizontal scroll

## Own Profile (`/my-athlete`)
- [ ] NO Buy/Sell buttons shown
- [ ] Share button visible
- [ ] Market cap card displays
- [ ] Inner Circle card shows owned state
- [ ] "Add Proof of Sweat" button visible
- [ ] Strava status visible (connected/not connected)
- [ ] Tab navigation works (Feed/Locker/Chat)
- [ ] No horizontal scroll

## Portfolio (`/portfolio`)
- [ ] Portfolio value displays
- [ ] Holdings list scrollable
- [ ] Each holding shows athlete, value, change
- [ ] Tapping holding navigates to athlete
- [ ] "Add Funds" button visible (if applicable)
- [ ] No horizontal scroll

## Feed (`/feed`)
- [ ] Feed cards display properly
- [ ] Cards show athlete info, workout, market cap
- [ ] Cards are tappable
- [ ] Feed is scrollable
- [ ] No horizontal scroll

## Bottom Navigation
- [ ] Always visible on protected routes
- [ ] All tabs tappable (≥44px)
- [ ] Active tab highlighted
- [ ] Navigates to correct route

## General Mobile UX
- [ ] No horizontal scroll on ANY page
- [ ] Text is readable (≥16px for body)
- [ ] No text truncation breaking meaning
- [ ] All buttons ≥44px touch target
- [ ] Content not hidden by bottom nav
- [ ] Loading states work correctly

---

## Issues Found

| Page | Issue | Severity | Screenshot |
|------|-------|----------|------------|
|      |       |          |            |

## Screenshots Captured

- 
- 
- 
