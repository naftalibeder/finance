# Finance

## About

A private, self-hosted personal finance app that pulls new transactions automatically and doesn't require trusting anyone else with your financial data or credentials.

## Instructions

Create a file `.env` in the main directory with the following environment variables set:

```
- SERVER_URL
- CLIENT_PORT
- SERVER_PORT
```

For example:

```
SERVER_URL=http://localhost:8001
CLIENT_PORT=8000
SERVER_PORT=8001
```

Create an empty folder `data` in the main directory.

Run the following:

```sh
npm install
npm run start
```

## Principles

- Data is stored in a human-readable format
- Transaction scraping happens automatically
- All passwords are encrypted and stored locally

## Roadmap

- [ ] Find a better name
