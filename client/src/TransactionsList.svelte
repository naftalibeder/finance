<script lang="ts">
  import { UUID } from "crypto";
  import { Transaction, Price, Account, PaginationApiPayload } from "shared";
  import { prettyCurrency, prettyNumber } from "../utils";
  import { TransactionsListItem } from ".";

  export let isLoading: boolean;
  export let transactions: Transaction[];
  export let transactionsSumPrice: Price;
  export let transactionsPagination: PaginationApiPayload;
  export let query: string;
  export let accounts: Account[];
  export let onClickShowMore: () => void;

  $: sectionText = buildSectionText(transactionsPagination.totalItemCt, query);

  $: accountsDict = ((_accounts: Account[]): Record<UUID, Account> => {
    const dict: Record<UUID, Account> = {};
    for (const a of _accounts) {
      dict[a._id] = a;
    }
    return dict;
  })(accounts);

  const buildSectionText = (totalCt: number, query: string): string => {
    const prettyCt = prettyNumber(totalCt);
    if (query.length > 0) {
      return `${prettyCt} transactions matching "${query}"`;
    } else {
      return `${prettyCt} transactions`;
    }
  };

  $: sumPriceDisp = prettyCurrency(transactionsSumPrice);
</script>

<div class="section">
  <div class="grid transactions">
    <div class="grid contents tall">
      <h3 class="cell transaction-section title">
        {sectionText}
      </h3>
      <h3 class="cell transaction-section action">
        {sumPriceDisp}
      </h3>
    </div>

    {#each transactions as t}
      <TransactionsListItem
        transaction={t}
        account={accountsDict[t.accountId]}
      />
    {/each}
  </div>

  {#if transactionsPagination}
    <div class="footer-container">
      {#if transactions.length > 0 && isLoading}
        <div class="faded">Loading more transactions</div>
      {:else if transactionsPagination.page < transactionsPagination.totalPageCt}
        <button on:click={() => onClickShowMore()}>
          Load more transactions
        </button>
      {:else if transactionsPagination.page === transactionsPagination.totalPageCt}
        <div class="faded">No more transactions</div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .grid.transactions {
    grid-template-columns:
      [gutter-l] var(--gutter)
      [date] minmax(80px, auto)
      [account] minmax(80px, auto)
      [payee] minmax(120px, 1fr)
      [description] auto
      [type] auto
      [price] minmax(100px, auto)
      [gutter-r] var(--gutter);
  }

  .cell.transaction-section.title {
    grid-column: date / type;
  }

  .cell.transaction-section.action {
    grid-column: price;
    justify-content: end;
  }

  .footer-container {
    display: grid;
    justify-content: center;
  }
</style>
