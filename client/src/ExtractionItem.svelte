<script lang="ts">
  import { Account, Extraction } from "shared";
  import { prettyDate, prettyDuration } from "../utils";

  export let extraction: Extraction;
  export let accounts: Account[];
  export let isExpanded = false;
  export let onClickToggleExpand: () => void;
</script>

<div>
  <button on:click={onClickToggleExpand}>
    <h3 class="section">
      {prettyDate(extraction.startedAt, { includeTime: true })}
    </h3>
  </button>

  {#if isExpanded}
    <div class="list">
      <div class="cell">Account</div>
      <div class="cell">Total found</div>
      <div class="cell">Total new</div>
      <div class="cell">Duration</div>
      <div class="cell error">Error</div>

      {#each Object.values(extraction.accounts) as account}
        <div class="cell">
          {accounts.find((o) => o._id === account.accountId)?.display}
        </div>
        <div class="cell">{account.foundCt}</div>
        <div class="cell">{account.addCt}</div>
        <div class="cell">
          {#if account.finishedAt}
            {prettyDuration(
              new Date(account.finishedAt).valueOf() -
                new Date(account.startedAt).valueOf()
            )}
          {:else if account.startedAt}
            In progress
          {:else}
            Pending
          {/if}
        </div>
        <div class="cell error">{account.error ?? ""}</div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .list {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    column-gap: 16px;
  }

  .section {
    grid-column: 1 / 6;
    margin-top: 24px;
    margin-bottom: 8px;
    cursor: pointer;
  }

  .error {
    overflow: scroll;
    white-space: nowrap;
  }
</style>
