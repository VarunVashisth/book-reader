import { expect, test } from '@playwright/test';
import path from 'node:path';

test('selects, copies, highlights, searches, navigates, and restores a real PDF', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.getByRole('button', { name: 'New here? Create a local account' }).click();
  await page.getByLabel('Email').fill('reader@example.com');
  await page.getByLabel('Password').fill('reader-test-password');
  await page.getByRole('button', { name: 'Create local account' }).click();
  await page.locator('input[type=file]').setInputFiles(path.resolve('src/test/fixtures/selectable-text.pdf'));
  await expect(page.getByText('selectable-text', { exact: true }).first()).toBeVisible({ timeout: 15_000 });
  await page.locator('.book-open').click();
  await expect(page.locator('.textLayer span').first()).toBeVisible();

  const spans = page.locator('.textLayer span');
  const first = await spans.nth(1).boundingBox(); const last = await spans.nth(3).boundingBox();
  expect(first).not.toBeNull(); expect(last).not.toBeNull();
  await page.mouse.move(first!.x + 2, first!.y + first!.height / 2);
  await page.mouse.down(); await page.mouse.move(last!.x + last!.width - 2, last!.y + last!.height / 2, { steps: 12 }); await page.mouse.up();
  await expect(page.locator('.selection-tools')).toBeVisible();
  const selected = await page.evaluate(() => getSelection()?.toString() ?? '');
  expect(selected).toContain('real embedded text'); expect(selected).toContain('multi-line selection');
  await page.getByRole('button', { name: 'Copy' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('real embedded text');
  await page.locator('.color-dot.yellow').click();
  await expect(page.locator('.saved-highlight').first()).toBeVisible();

  await page.getByRole('button', { name: 'Bookmark page' }).click();
  await expect(page.getByRole('button', { name: 'Remove bookmark' })).toBeVisible();
  await page.getByRole('button', { name: 'Search book' }).click();
  await page.getByPlaceholder('Search this book').fill('lighthouse reading garden');
  await page.getByPlaceholder('Search this book').press('Enter');
  await page.getByRole('button', { name: /Page 2/ }).click();
  await expect(page.getByLabel('Current page')).toHaveValue('2');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByLabel('Current page')).toHaveValue('1');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Remove bookmark' })).toBeVisible();
  await expect(page.locator('.saved-highlight').first()).toBeVisible();
});
