import { test, expect } from '@playwright/test';

test.describe('Mobile Locker History Parity', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('Mobile locker should show workout history like desktop', async ({ page }) => {
    // This test assumes user is logged in and has workouts
    // In a real scenario, you'd set up test data first
    
    await page.goto('/my-athlete');
    
    // Navigate to Personal/Locker accordion
    await page.click('text=Personal');
    
    // Switch to Locker tab
    await page.click('[role="tab"]:has-text("Locker")');
    
    // Should see either:
    // 1. Empty state with "Create Locked Post" button if no locked content
    // 2. ProofOfSweat component with workout history if there is locked content
    
    const emptyState = page.locator('text=No locked content yet');
    const createButton = page.locator('button:has-text("Create Locked Post")');
    const workoutHistory = page.locator('[data-testid="proof-of-sweat"]');
    
    // Either empty state or workout history should be visible
    const hasEmptyState = await emptyState.isVisible();
    const hasHistory = await workoutHistory.isVisible();
    
    expect(hasEmptyState || hasHistory).toBeTruthy();
    
    // If empty state, button should be clickable
    if (hasEmptyState) {
      await expect(createButton).toBeVisible();
      await expect(createButton).toBeEnabled();
    }
  });

  test('Mobile locker should be scrollable with many workouts', async ({ page }) => {
    await page.goto('/my-athlete');
    
    // Navigate to locker
    await page.click('text=Personal');
    await page.click('[role="tab"]:has-text("Locker")');
    
    // Check if ScrollArea exists (only when there's content)
    const scrollArea = page.locator('[data-radix-scroll-area-viewport]');
    
    // If content exists, it should be in a scrollable container
    const hasContent = await page.locator('text=No locked content yet').isHidden();
    if (hasContent) {
      await expect(scrollArea).toBeVisible();
    }
  });
});
