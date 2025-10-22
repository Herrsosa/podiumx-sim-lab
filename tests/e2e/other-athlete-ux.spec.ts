import { test, expect } from '@playwright/test';

const baseUrl = process.env.PLAYWRIGHT_BASE_URL;
const otherAthleteSlug = process.env.E2E_OTHER_ATHLETE_SLUG;
const otherAthleteFirstName = process.env.E2E_OTHER_ATHLETE_FIRSTNAME;
const selfLockerUrl = process.env.E2E_SELF_LOCKER_URL;

const describeOtherAthlete = baseUrl && otherAthleteSlug ? test.describe : test.describe.skip;
const describeSelfLocker = baseUrl && selfLockerUrl ? test.describe : test.describe.skip;

describeOtherAthlete('Other athlete locker & overview', () => {
  const resolvedBaseUrl = baseUrl!;
  const resolvedSlug = otherAthleteSlug!;

  test('overview hides training feed and community chat', async ({ page }) => {
    await page.goto(`${resolvedBaseUrl}/athlete/${resolvedSlug}`);

    await expect(page.getByRole('heading', { name: 'Proof of Sweat' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Training Feed' })).toHaveCount(0);
    await expect(page.locator('text=Community Chat')).toHaveCount(0);
  });

  test('locker exposes a single direct-message composer', async ({ page }) => {
    await page.goto(`${resolvedBaseUrl}/athlete/${resolvedSlug}`);
    await page.getByRole('tab', { name: 'Locker' }).click();

    const locker = page.getByTestId('locker-messages-other');
    await expect(locker).toBeVisible();

    const messageButton = locker.getByRole('button', { name: /Message/i });
    await expect(messageButton).toBeVisible();

    if (otherAthleteFirstName?.trim()) {
      await expect(messageButton).toHaveText(new RegExp(`Message\\s+${otherAthleteFirstName.trim()}`, 'i'));
    }

    await expect(locker.locator('textarea')).toBeVisible();
    await expect(locker.locator('input[placeholder="Username"]')).toHaveCount(0);
  });
});

describeSelfLocker('My athlete locker messaging', () => {
  const resolvedSelfLockerUrl = selfLockerUrl!;

  test('owner messaging tools remain in place', async ({ page }) => {
    await page.goto(resolvedSelfLockerUrl);

    const locker = page.getByTestId('locker-messages-owner');
    await expect(locker).toBeVisible();
    await expect(locker.locator('input[placeholder="Username"]')).toBeVisible();
    await expect(locker.locator('button', { hasText: 'Start' })).toBeVisible();
  });
});
