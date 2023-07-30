<script lang="ts">
  import { Account, Extraction } from "shared";
  import { prettyDate, prettyDuration } from "../utils";

  export let extractions: Extraction[];
  export let accounts: Account[];

  $: extractionsReversed = [...extractions].reverse();
</script>

<div class="container">
  <h2>Extraction history</h2>
  <div class="list">
    <div class="group">
      <div>Account</div>
      <div>Total</div>
      <div>New</div>
      <div>Duration</div>
      <div>Error</div>
    </div>

    {#each extractionsReversed as extraction}
      <div class="group">
        <div class="section">
          Extraction at {prettyDate(extraction.startedAt, {
            includeTime: true,
          })}
        </div>
      </div>

      <div class="group">
        {#each Object.values(extraction.accounts) as account}
          <div class="cell">
            {accounts.find((o) => o._id === account.accountId)?.display}
          </div>
          <div class="cell">{account.foundCt}</div>
          <div class="cell">{account.addCt}</div>
          <div class="cell">
            {prettyDuration(
              new Date(account.finishedAt).valueOf() -
                new Date(account.startedAt).valueOf()
            )}
          </div>
          <div class="cell error">{account.error ?? ""}</div>
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
    grid-template-columns: repeat(5, auto);
    column-gap: 16px;
  }

  .group {
    display: contents;
  }

  .section {
    grid-column: 1 / 6;
    margin-top: 24px;
    margin-bottom: 8px;
  }

  .error {
    overflow: scroll;
    white-space: nowrap;
  }
</style>
