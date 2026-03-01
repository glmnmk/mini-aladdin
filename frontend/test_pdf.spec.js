import { test, expect } from '@playwright/test';

test('click export', async ({ page }) => {
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('http://localhost:5173');
  await page.waitForSelector('text=Run Simulation');
  await page.click('text=Export PDF');
  await page.waitForTimeout(2000);
  
  if (errors.length > 0) {
    console.log("ERRORS:", errors.join("\\n"));
  } else {
    console.log("No errors.");
  }
});
