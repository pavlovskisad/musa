// Still of the onboarding lore screen (the Mansa Musa block), for the brand section of /overview.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 760 }, deviceScaleFactor: 2, locale: 'en-US' });
  await ctx.route('**/api/units**', (r) => r.fulfill({ json: [] }));
  await ctx.route('**/api.coingecko.com/**', (r) => r.fulfill({ json: { 'pax-gold': { usd: 3530 } } }));
  const page = await ctx.newPage();
  await page.goto('http://localhost:5179/?anon');
  await page.waitForTimeout(3500);
  await page.evaluate(() => document.fonts.ready);
  // the lore screen is the second full-height screen of the onboarding scroller
  await page.evaluate(() => {
    const sc = [...document.querySelectorAll('*')].find((e) => getComputedStyle(e).scrollSnapType.includes('y'));
    sc.scrollTo({ top: sc.clientHeight, behavior: 'instant' });
  });
  await page.waitForTimeout(4500);
  const dir = __dirname + '/film/lore';
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: dir + '/lore.png' });
  console.log('saved', dir + '/lore.png');
  await b.close();
})();
