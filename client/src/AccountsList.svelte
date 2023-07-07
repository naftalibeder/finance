<script lang="ts">
  import { UUID } from "crypto";
  import { Account, Bank, ExtractionStatus, Price } from "shared";
  import { prettyCurrency } from "../utils";
  import { AccountsListItem } from ".";

  export let accounts: Account[];
  export let accountsSum: Price;
  export let banks: Bank[];
  export let extractionStatus: ExtractionStatus;
  export let onClickCreate: () => void;
  export let onClickAccount: (accountId: UUID) => void;
  export let onClickExtract: (accountIds?: UUID[]) => void;

  $: anyIsExtracting = Object.keys(extractionStatus.accounts).length > 0;
</script>

<div class="section">
  <div class="grid accounts">
    <div class="grid contents tall">
      <div class="cell account-section title">
        <div>
          {accounts.length} accounts
        </div>
        <button style="margin-left: 8px" on:click={(evt) => onClickCreate()}>
          +
        </button>
      </div>
      <div class="cell account-section action">
        {prettyCurrency(accountsSum)}
      </div>
      <div class="cell account gutter-r">
        {#if !anyIsExtracting}
          <button on:click={() => onClickExtract()}>↻</button>
        {/if}
      </div>
    </div>

    {#each accounts as a}
      <AccountsListItem
        account={a}
        bank={banks.find((o) => o.id === a.bankId)}
        extractionStatus={extractionStatus.accounts[a._id]}
        onClickAccount={() => onClickAccount(a._id)}
        onClickExtract={() => onClickExtract([a._id])}
      />
    {/each}
  </div>
</div>

<style>
  .grid.accounts {
    grid-template-areas: "gutter-l name bank price gutter-r";
    grid-template-columns: var(--gutter) 1fr 2fr auto var(--gutter);
  }

  .cell.account-section.title {
    grid-column: name / bank;
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
