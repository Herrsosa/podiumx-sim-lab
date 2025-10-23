import { test, expect, devices } from '@playwright/test';

// Test mobile CTA bar functionality
test.describe('Mobile CTA Bar', () => {
  test.use({
    ...devices['iPhone 12'],
  });

  test('should display and be tappable on athlete detail page', async ({ page }) => {
    // Navigate to athlete detail page
    await page.goto('/athlete/max-striker');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check that mobile action bar is visible
    const mobileBar = page.locator('[class*="MobileActionBar"]').first();
    await expect(mobileBar).toBeVisible();
    
    // Check Buy button exists and is clickable
    const buyButton = page.getByRole('button', { name: /buy/i });
    await expect(buyButton).toBeVisible();
    await expect(buyButton).toBeEnabled();
    
    // Check Sell button exists and is clickable
    const sellButton = page.getByRole('button', { name: /sell/i });
    await expect(sellButton).toBeVisible();
    await expect(sellButton).toBeEnabled();
    
    // Check Message button exists and is clickable  
    const messageButton = page.getByRole('button', { name: /message/i });
    await expect(messageButton).toBeVisible();
    await expect(messageButton).toBeEnabled();
    
    // Tap Buy button - should scroll to trade section
    await buyButton.click();
    await page.waitForTimeout(500);
    
    // Verify trade section is visible
    const tradeSection = page.getByText('Trade').first();
    await expect(tradeSection).toBeVisible();
  });

  test('should not show buy/sell on own profile', async ({ page }) => {
    // Login first
    await page.goto('/auth');
    // ... authentication flow ...
    
    // Navigate to my athlete page
    await page.goto('/my-athlete');
    await page.waitForLoadState('networkidle');
    
    // Mobile bar should exist but not have Buy/Sell
    const buyButton = page.getByRole('button', { name: /^buy$/i });
    const sellButton = page.getByRole('button', { name: /^sell$/i });
    
    await expect(buyButton).not.toBeVisible();
    await expect(sellButton).not.toBeVisible();
  });

  test('should have safe tap targets (≥44px)', async ({ page }) => {
    await page.goto('/athlete/max-striker');
    await page.waitForLoadState('networkidle');
    
    const buttons = await page.getByRole('button').filter({ hasText: /buy|sell|message/i }).all();
    
    for (const button of buttons) {
      const box = await button.boundingBox();
      expect(box).not.toBeNull();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should not have horizontal scroll', async ({ page }) => {
    const viewports = [
      { width: 360, height: 800 },
      { width: 393, height: 852 },
      { width: 430, height: 932 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/athlete/max-striker');
      await page.waitForLoadState('networkidle');
      
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // Allow 1px tolerance
    }
  });

  test('should have proper z-index (not blocked by other elements)', async ({ page }) => {
    await page.goto('/athlete/max-striker');
    await page.waitForLoadState('networkidle');
    
    // Get the buy button
    const buyButton = page.getByRole('button', { name: /buy/i });
    
    // Check if it's clickable (not covered)
    await expect(buyButton).toBeVisible();
    const isClickable = await buyButton.isEnabled();
    expect(isClickable).toBe(true);
    
    // Try to click it - should not throw
    await buyButton.click({ timeout: 1000 });
  });
});

test.describe('Mobile Responsiveness', () => {
  test('should work on various mobile sizes', async ({ page }) => {
    const sizes = [
      { width: 360, height: 800, name: 'Small phone' },
      { width: 393, height: 852, name: 'iPhone 13' },
      { width: 430, height: 932, name: 'iPhone 14 Pro Max' },
    ];

    for (const size of sizes) {
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto('/athlete/max-striker');
      
      // Check mobile action bar is visible
      const buyButton = page.getByRole('button', { name: /buy/i });
      await expect(buyButton).toBeVisible();
      
      // Check no horizontal overflow
      const hasOverflow = await page.evaluate(() => {
        return document.body.scrollWidth > document.body.clientWidth;
      });
      expect(hasOverflow).toBe(false);
    }
  });
});
