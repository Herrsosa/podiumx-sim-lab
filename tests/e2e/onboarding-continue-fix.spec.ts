import { test, expect } from '@playwright/test';

test.describe('Onboarding Continue Button Fix', () => {
  test('Fan profile Continue button should be enabled when name is filled', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Select fan role
    await page.click('text=Continue as Fan');
    
    // Fill in required name field
    await page.fill('input[id="name"]', 'Test Fan');
    
    // Continue button should be enabled
    const continueButton = page.locator('button:has-text("Continue")');
    await expect(continueButton).toBeEnabled();
    
    // Click Continue should navigate to next step
    await continueButton.click();
    
    // Should see wallet setup page
    await expect(page.locator('text=Your Wallet is Ready')).toBeVisible({ timeout: 10000 });
  });

  test('Continue button should be disabled when name is empty', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Select fan role
    await page.click('text=Continue as Fan');
    
    // Leave name empty
    const continueButton = page.locator('button:has-text("Continue")');
    
    // Continue button should be disabled
    await expect(continueButton).toBeDisabled();
  });
});
