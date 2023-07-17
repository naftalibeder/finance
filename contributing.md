# Tasks

## To consider

- Enable saved queries/filters that update and are always visible
- Speed up extraction by skipping authentication after each transaction scrape
- Allow browser installation in `node_modules`: https://playwright.dev/docs/browsers#hermetic-install
- Implement rules for transforming transactions
- Make the horizontal time chart more useful by (allowing) zooming in or dragging to select
- It's currently possible for a transaction to be scraped on (say) June 20, then scraped again and marked June 21 (?)

## To do

- Before running extraction, check db to ensure no other extraction is running
- Set up a timer to automatically extract every day
- Paginated infinite scroll on transactions list
- Create an extractions list in the database that assigns a unique ID to each extraction attempt and a timestamp and metrics about it
- Allow creating an account in a dedicated flow
- Enable logging out from the UI

## In progress

- Improve mobile layout and hover-buttons to make mobile friendly @naftalibeder

## Done

- Implement password protection
- Create chase bank extractor
- Show horizontal graph of all filtered transactions
- Instead of sending response chunks, just save current extraction status to db and ping the client to update when it changes (that way the client can refresh without losing state)
- Include current account being extracted in chunk response data
- Show account timestamps on hover
