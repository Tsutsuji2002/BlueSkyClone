const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });

    console.log('Navigating to login...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

    // Log in
    await page.type('input[type="email"], input[type="text"]', 'testing@gmail.com');
    // Need to find password input
    const inputs = await page.$$('input');
    if (inputs.length > 1) {
        await inputs[1].type('password123');
    }
    await page.click('button[type="submit"]');

    console.log('Waiting for network...');
    await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(e => console.log('Navigation wait timed out'));
    await page.waitForTimeout(2000);

    // Take a screenshot before modifying state
    await page.screenshot({ path: 'test_before.png' });

    // Force sticky header to simulate many feeds using evaluate
    await page.evaluate(() => {
        const tabsContainer = document.querySelector('.overflow-x-auto .w-max');
        if (tabsContainer) {
            for (let i = 0; i < 15; i++) {
                const btn = document.createElement('button');
                btn.className = 'px-4 py-3 text-[15px] font-bold transition-all relative whitespace-nowrap flex-shrink-0 text-gray-500';
                btn.innerText = 'Test Feed ' + i;
                tabsContainer.appendChild(btn);
            }
        }
    });

    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test_after_feeds.png' });

    // Scroll down
    await page.evaluate(() => {
        window.scrollBy(0, 500);
    });

    await page.waitForTimeout(500);
    await page.screenshot({ path: 'test_scrolled.png' });

    // Also get the bounding box of the sticky header
    const headerInfo = await page.evaluate(() => {
        const header = document.querySelector('.sticky.top-0');
        return header ? header.getBoundingClientRect() : null;
    });
    console.log('Header rect:', headerInfo);

    await browser.close();
})();
