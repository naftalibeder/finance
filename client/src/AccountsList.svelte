<script lang="ts">
  import { Account, ExtractionStatus, Price } from "shared";
  import { prettyCurrency } from "../utils";

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
        <!-- <div class="cell account gutter-l">
            <Checkbox
              active={activeAccountsDict[a._id] === true}
              onClick={() => {
                activeAccountsDict[a._id] = !activeAccountsDict[a._id];
              }}
            />
          </div> -->
        <div class="cell account name">
          {a.display}
        </div>
        <div class="cell account price">{prettyCurrency(a.price)}</div>
        <div class="cell account gutter-r">
          {#if a._id === extractionStatus.accountId}
            <div>...</div>
          {:else}
            <button on:click={() => onClickExtract([a._id])}>↻</button>
          {/if}
        </div>
        <!-- <div class="cell account timestamp">
          {prettyDate(a.updatedAt, { includeTime: true }) ??
            "Never updated"}
        </div> -->
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
</style>
