const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    // Load the page
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

    // Evaluate the layout without logging in, just checking structure if possible
    // Wait, I can inject a dummy layout representing HomePage
    const domInfo = await page.evaluate(() => {
        // We shouldn't need login just to see basic CSS rules
        return {
            bodyOverflow: getComputedStyle(document.body).overflow,
            htmlOverflow: getComputedStyle(document.documentElement).overflow
        };
    });
    console.log(domInfo);

    await browser.close();
})();
