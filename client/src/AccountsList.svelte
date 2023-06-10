<script lang="ts">
  import { Account, ExtractionStatus, Price } from "shared";
  import { prettyCurrency } from "../utils";
  import AccountsListItem from "./AccountsListItem.svelte";

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
      <AccountsListItem
        account={a}
        isExtracting={a._id === extractionStatus.accountId}
        {onClickExtract}
      />
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

  .gutter-r {
    opacity: 0;
  }

  .grid.contents:hover .gutter-r {
    opacity: 0.5;
  }
</style>
