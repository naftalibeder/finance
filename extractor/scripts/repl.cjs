/*
Usage:

// Set up the environment and open a browser window.
~ node
> const _ = require('./scripts/repl.cjs')
> const page = await _.launch()

// Navigate manually in either the browser or the terminal.
> await page.goto('https://mybank.com')

// Save all html to a file in `./tmp`.
> await _.scrape(page)

// If generating a test to commit to version control, be sure to manually remove
// personally identifying information! Example expressions:
// ".* \(\.{3}\d{4}\)"
*/

const { firefox } = require("@playwright/test");
const { writeFileSync } = require("fs");

module.exports.launch = async () => {
  const browser = await firefox.launch({ headless: false });
  const page = await browser.newPage();
  return page;
};

module.exports.scrape = async (page) => {
  const frames = await page.frames();
  let allHtml = "";
  for (const frame of frames) {
    const html = await frame.locator("body").innerHTML();
    allHtml += `${html}`;
  }
  allHtml = `<html><body>${allHtml}</body></html>`;

  const path = `./tmp/${new Date().toISOString()}.html`;
  writeFileSync(path, allHtml);
  console.log(`Wrote html of length ${allHtml.length} to ${path}`);
};
