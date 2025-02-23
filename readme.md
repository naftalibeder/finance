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
```

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

### Triggering extractions

To initiate an extraction of all accounts with an HTTP request (e.g. from a cron job):

```sh
curl -X POST <SERVER_URL>/extractAll
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
