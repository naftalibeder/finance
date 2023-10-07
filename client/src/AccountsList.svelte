<script lang="ts">
  import { UUID } from "crypto";
  // @ts-ignore
  import { Account, Bank, Extraction, Price } from "shared";
  import { prettyCurrency } from "../utils";
  import { AccountsListItem, Icon } from ".";

  export let accounts: Account[];
  export let accountsSum: Price;
  export let banks: Bank[];
  export let bankCredsExistMap: Record<string, boolean>;
  export let unfinishedExtractions: Extraction[];
  export let onClickCreate: () => void;
  export let onClickAccount: (accountId: UUID) => void;
  export let onClickExtract: (accountIds?: UUID[]) => void;
</script>

<div class="section">
  <div class="grid accounts">
    <div class="grid contents tall">
      <div class="cell account-section title">
        <h3>
          {accounts.length} accounts
        </h3>
        <button class="add hover-fade" on:click={(evt) => onClickCreate()}>
          <Icon kind="plus" />
        </button>
      </div>
      <h3 class="cell account-section action">
        {prettyCurrency(accountsSum)}
      </h3>
      <div class="cell account gutter-r">
        {#if unfinishedExtractions.length === 0}
          <button class="hover-fade" on:click={() => onClickExtract()}>
            <Icon kind="reload" size="small" />
          </button>
        {/if}
      </div>
    </div>

    {#each accounts as a}
      <AccountsListItem
        account={a}
        bank={banks.find((o) => o.id === a.bankId)}
        hasCredsForBank={bankCredsExistMap[a.bankId]}
        extraction={unfinishedExtractions.find((o) => o.accountId === a._id)}
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
    justify-content: end;
  }

  .gutter-r {
    opacity: 0;
  }

  .grid.contents:hover .gutter-r {
    opacity: 0.5;
  }

  button.add {
    margin-left: 8px;
  }
</style>
