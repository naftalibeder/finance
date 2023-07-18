/*
Usage:
~ node
> const page = await require('./scripts/repl').launch()
> await page.goto('https://nytimes.com')
> await page.getByRole('link', { name: 'Magazine' }).click()
*/

const { firefox } = require("@playwright/test");

module.exports.launch = async () => {
  const browser = await firefox.launch({ headless: false });
  const page = await browser.newPage();
  return page;
};
