# Finance

## About

A private, self-hosted personal finance app that pulls new transactions automatically and doesn't require trusting anyone else with your financial data or credentials.

## Instructions

1. Set up the project and install dependencies:

```sh
npm run setup
npm install
```

2. Install dependencies for the headless browser. (May require sudo.)

```sh
cd server && npx playwright install firefox --with-deps
```

3. Update `.env` with a value for `BROWSER_EXECUTABLE` output by the previous command, and change any other variables as needed.

4. Run the client and server:

```sh
npm run start
```

## Principles

- Data is stored in a human-readable format
- Transaction scraping happens automatically
- All passwords are encrypted and stored locally

## Roadmap

- [ ] Find a better name
