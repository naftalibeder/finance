<script lang="ts">
  import { Account, Extraction } from "shared";
  import { prettyDate, prettyDuration } from "../utils";

  export let extractions: Extraction[];
  export let accounts: Account[];
</script>

<div class="container">
  <h2>Extraction history</h2>
  <div class="list">
    <div class="group">
      <div>Account</div>
      <div>Found</div>
      <div>New</div>
      <div>Duration</div>
      <div>Error</div>
    </div>

    {#each extractions as extraction}
      <div class="group">
        <div class="section">
          {prettyDate(extraction.startedAt, { includeTime: true })}
        </div>
      </div>

      <div class="group">
        {#each Object.values(extraction.accounts) as account}
          <div>
            {accounts.find((o) => o._id === account.accountId)?.display}
          </div>
          <div>{account.foundCt}</div>
          <div>{account.addCt}</div>
          <div>
            {prettyDuration(
              new Date(account.finishedAt).valueOf() -
                new Date(account.startedAt).valueOf()
            )}
          </div>
          <div class="error">{account.error}</div>
        {/each}
      </div>
    {/each}
  </div>
</div>

<style>
  .container {
    display: grid;
    row-gap: 12px;
    padding: 32px;
  }

  .list {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
    column-gap: 16px;
    row-gap: 16px;
  }

  .group {
    display: contents;
  }

  .section {
    grid-column: 1 / 6;
    margin-top: 16px;
  }

  .error {
    overflow: scroll;
    white-space: nowrap;
  }
</style>
