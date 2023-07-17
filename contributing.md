# Tasks

## To consider

- Enable saved queries/filters that update and are always visible
- Speed up extraction by skipping authentication after each transaction scrape
- Allow browser installation in `node_modules`: https://playwright.dev/docs/browsers#hermetic-install

## To do

- Before running extraction check db to ensure no other extraction is running
- Set up a timer to automatically extract every day
- Create an extractions list in the database that assigns a unique ID to each extraction attempt and a timestamp and metrics about it
- Implement rules for transforming transactions

## In progress

## Done

- Implement password protection
- Create chase bank extractor
- Show horizontal graph of all filtered transactions
- Instead of sending response chunks, just save current extraction status to db and ping the client to update when it changes (that way the client can refresh without losing state)
- Include current account being extracted in chunk response data
- Show account timestamps on hover
