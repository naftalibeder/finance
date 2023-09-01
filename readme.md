# Finance

## About

A private, self-hosted personal finance app that pulls new transactions automatically and doesn't require trusting anyone else with your financial data or credentials.

## Instructions

1. Set up the project and install dependencies.

```sh
npm run setup
npm install
```

2. Install dependencies for the headless browser.

```sh
cd server && npx playwright install firefox --with-deps
```

3. Update `.env` with a value for `BROWSER_EXECUTABLE` output by the previous command, and change any other variables as needed.

4. Run the client, server, and extractor. (You can also run each from its own directory.)

```sh
npm run start
```

## Principles

- Automatic recurring transaction scraping
- All passwords are encrypted and stored locally
- Search is actually good
- Fast client load

## Roadmap

- [ ] Find a better name
