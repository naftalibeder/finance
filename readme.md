# Finance

A private, self-hosted personal finance app that pulls new transactions automatically and doesn't require trusting anyone else with your financial data or credentials.

## Instructions

### Setup

1. Set up the project file and directory structure.

```sh
npm run setup
```

2. Install dependencies.

```sh
npm install
cd server && npx playwright install firefox --with-deps
```

3. Update `.env` with a value for `BROWSER_EXECUTABLE` output by the previous command[^1], and change any other variables as needed.

[^1] This is finicky due to a bug in Playwright related to Firefox. You'll need to verify it's pointing to an actual executable.

### Running

Run the client, server, and extractor.

```sh
npm run start
```

The command above uses [`concurrently`](https://github.com/open-cli-tools/concurrently) to run all three servers from a single terminal instance.

In production, it's encouraged to run each as a separate service, to make it easier to restart a single process if needed.

```sh
cd client && npm run start
cd server && npm run start
cd extractor && npm run start
```

### Testing

#### Executing tests

Tests can be run from the project root:

```sh
npm run test
```

or from each directory, like:

```sh
cd extractor && npm run test
```

#### Creating new tests

Any file ending in `_test.ts` will be run automatically. To create a test fixture, follow the usage instructions in `./scripts/repl.cjs`.

## Principles

- Automatic recurring transaction scraping.
- All passwords are encrypted and stored locally.
- Good searching by date, category, price or price range, keyword, account, etc. Boolean searches possible.
- Fast client load.
