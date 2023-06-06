<script lang="ts">
  import { Account, ExtractionStatus, Price } from "shared";
  import { prettyCurrency, prettyTimeAgo } from "../utils";

  export let accounts: Account[];
  export let accountsSum: Price;
  export let extractionStatus: ExtractionStatus;
  export let onClickExtract: (accountIds?: string[]) => void;
</script>

<div class="section">
  <div class="grid accounts">
    <div class="grid contents tall">
      <div class="cell account-section title">
        {accounts.length} accounts
      </div>
      <div class="cell account-section action">
        {prettyCurrency(accountsSum)}
      </div>
      <div class="cell account gutter-r">
        {#if extractionStatus.accountId}
          <div>...</div>
        {:else}
          <button on:click={() => onClickExtract()}>↻</button>
        {/if}
      </div>
    </div>

    {#each accounts as a}
      <div class="grid contents">
        <div class="cell account name">
          {a.display}
        </div>
        <div class="cell account price">{prettyCurrency(a.price)}</div>
        <div class="cell account gutter-r">
          {#if a._id === extractionStatus.accountId}
            <div>...</div>
          {:else}
            <button class="refresh" on:click={() => onClickExtract([a._id])}
              >↻</button
            >
            <div class="timestamp">{prettyTimeAgo(a._updatedAt)}</div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .grid.accounts {
    grid-template-areas: "gutter-l name status price gutter-r";
    grid-template-columns: var(--gutter) 1fr 2fr auto var(--gutter);
  }

  .cell.account-section.title {
    grid-column: name / status;
  }

  .cell.account-section.action {
    grid-column: price;
    justify-content: flex-end;
  }

  .cell.account.name {
    grid-column-start: name;
  }

  .cell.account.price {
    grid-column-start: price;
    justify-content: flex-end;
  }

  .gutter-r {
    opacity: 0;
  }

  .grid.contents:hover .gutter-r {
    opacity: 0.5;
  }

  .refresh:hover {
    opacity: 0.35;
  }

  .timestamp {
    margin-left: 6px;
  }
</style>
