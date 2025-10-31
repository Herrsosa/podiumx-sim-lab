# React Profiler Notes

> Tooling limitation: The Codex CLI environment cannot run a browser or React
> DevTools, so actual profiler traces could not be captured during this pass.
> The sections below document the exact flows to profile and placeholders where
> metrics should be recorded when the app is run locally with React DevTools.

## 1. Marketplace Load (Initial Render)

- **Scenario**: Navigate from a cold start to `/marketplace`.
- **Profiler snapshot**: `marketplace-load-before`
- **Observed metrics**: _(record commit duration, renders for list items, etc.)_
- **Notes**:
  - Pay attention to the top movers list and hero cards.
  - Capture which components re-render more than once.

## 2. Athlete Detail Range Switch

- **Scenario**: Open an athlete detail page, toggle `7d → 30d → all` on the price chart.
- **Profiler snapshot**: `athlete-range-switch-before`
- **Observed metrics**: _(record chart re-render counts, commit time, expensive components)_
- **Notes**:
  - Note whether the chart and surrounding cards re-render multiple times per switch.
  - Watch for expensive selectors or re-mapped arrays.

## 3. MyAthlete Tab Toggles

- **Scenario**: On `/my-athlete/overview`, toggle between “Workout Timeline” and other tabs.
- **Profiler snapshot**: `myathlete-tabs-before`
- **Observed metrics**: _(record number of renders for timeline items, chart, etc.)_
- **Notes**:
  - Inspect whether the timeline list or chart rebuilds on every tab change.
  - Track any global state updates that cause redundant renders.

Once actual profiler data is collected locally, replace the placeholders above and
append “after” snapshots (e.g., `marketplace-load-after`) following each optimization pass.

## Follow-up

- The memoization and query-stabilization pass has been applied. Re-run the three
  scenarios above locally to capture the corresponding `*-after` snapshots and
  record their metrics here for comparison.

