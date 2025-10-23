import { test, expect } from '@playwright/test';

test.describe('Athlete Proof-of-Sweat CTA', () => {
  test.use({
    viewport: { width: 390, height: 844 }, // iPhone 12
  });

  test('Own profile shows Add Proof of Sweat button, not Buy/Sell', async ({ page }) => {
    // Navigate to own athlete page (requires auth setup in actual implementation)
    await page.goto('/my-athlete');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Check that Buy/Sell buttons are NOT present
    await expect(page.getByRole('button', { name: /buy/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /sell/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /follow/i })).not.toBeVisible();

    // Check that Add Proof of Sweat button IS present
    const addPosButton = page.getByRole('button', { name: /add proof of sweat/i });
    await expect(addPosButton).toBeVisible();
    
    // Verify it's tappable (min height 44px)
    const box = await addPosButton.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });

  test('Add Proof of Sweat modal opens and saves', async ({ page }) => {
    await page.goto('/my-athlete');
    await page.waitForLoadState('networkidle');

    // Click Add Proof of Sweat button
    const addPosButton = page.getByRole('button', { name: /add proof of sweat/i });
    await addPosButton.click();

    // Wait for modal to open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/add workout/i)).toBeVisible();

    // Fill in workout form
    await page.fill('input[type="number"][placeholder*="45"]', '30');
    await page.selectOption('select', 'Run');
    await page.fill('input[type="number"][min="1"][max="10"]', '7');

    // Submit form
    await page.getByRole('button', { name: /post workout/i }).click();

    // Wait for success (modal closes)
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 });
  });

  test('Other athlete profile shows Buy/Sell buttons', async ({ page }) => {
    // Navigate to another athlete's page
    await page.goto('/athlete/max'); // Assuming 'max' is a test athlete

    await page.waitForLoadState('networkidle');

    // Check that Buy and Sell buttons ARE present
    await expect(page.getByRole('button', { name: /buy/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sell/i })).toBeVisible();

    // Check that Add Proof of Sweat is NOT present
    await expect(page.getByRole('button', { name: /add proof of sweat/i })).not.toBeVisible();
  });

  test('Mobile CTA bar is tappable and not blocked', async ({ page }) => {
    await page.goto('/athlete/max');
    await page.waitForLoadState('networkidle');

    const buyButton = page.getByRole('button', { name: /buy/i });
    
    // Verify button is visible and in viewport
    await expect(buyButton).toBeVisible();
    
    // Verify z-index is high enough (check computed style)
    const zIndex = await buyButton.evaluate((el) => {
      const parent = el.closest('[class*="fixed"]');
      return parent ? window.getComputedStyle(parent).zIndex : '0';
    });
    expect(parseInt(zIndex)).toBeGreaterThanOrEqual(1000);

    // Click Buy button
    await buyButton.click();

    // Verify trade modal opens
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('No horizontal scroll on narrow viewports', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/my-athlete');
    await page.waitForLoadState('networkidle');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // Allow 5px tolerance
  });

  test('Locker tab empty state shows correct message for self', async ({ page }) => {
    await page.goto('/my-athlete');
    await page.waitForLoadState('networkidle');

    // Navigate to Locker section
    await page.getByRole('tab', { name: /locker/i }).click();

    // Verify empty state message
    await expect(page.getByText(/no locked content yet/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create locked post/i })).toBeVisible();
  });

  test('Locker tab shows upgrade message for other athletes', async ({ page }) => {
    await page.goto('/athlete/max');
    await page.waitForLoadState('networkidle');

    // Navigate to Locker tab
    await page.getByRole('tab', { name: /locker/i }).click();

    // Should show lock/upgrade message if no tokens
    const lockerContent = page.locator('[role="tabpanel"]');
    await expect(lockerContent).toContainText(/buy tokens|unlock/i);
  });
});
