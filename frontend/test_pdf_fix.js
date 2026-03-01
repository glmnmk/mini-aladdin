import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('dialog', async dialog => {
    console.log('DIALOG:', dialog.message());
    await dialog.accept();
  });

  try {
    await page.goto('http://localhost:5173');
    await new Promise(r => setTimeout(r, 2000));

    console.log("Adding MSFT...");
    const input = await page.$('input[placeholder="TICKER (E.G. SPY)"]');
    if (input) {
      await input.type('MSFT');
      await page.keyboard.press('Enter');
    }
    await new Promise(r => setTimeout(r, 1000));

    console.log("Clicking run analysis...");
    const buttons = await page.$$('button');
    for (let btn of buttons) {
      const text = await (await btn.getProperty('textContent')).jsonValue();
      if (text && text.includes('Run Simulation')) {
        await btn.click();
        console.log("Clicked run simulation");
        break;
      }
    }

    console.log("Waiting for analysis to complete...");
    await new Promise(r => setTimeout(r, 6000));

    console.log("Clicking export...");
    const endButtons = await page.$$('button');
    for (let btn of endButtons) {
      const text = await (await btn.getProperty('textContent')).jsonValue();
      if (text && text.includes('Export PDF')) {
        await btn.click();
        console.log("Clicked Export PDF");
        break;
      }
    }

    await new Promise(r => setTimeout(r, 5000));
    console.log("Done waiting, closing.");
  } catch (err) {
    console.log("SCRIPT ERROR:", err);
  } finally {
    await browser.close();
  }
})();
