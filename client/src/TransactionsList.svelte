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
  export let accountsDict: Record<UUID, Account>;
  export let onClickShowMore: () => void;

  $: sectionText = buildSectionText(
    transactions.length,
    transactionsPagination?.itemCt ?? 0,
    query
  );

  const buildSectionText = (
    ct: number,
    totalCt: number,
    query: string
  ): string => {
    const prettyCt = prettyNumber(ct);
    const prettyTotalCt = prettyNumber(totalCt);

    if (query.length > 0 && ct < totalCt) {
      return `${prettyCt} of ${prettyTotalCt} transactions (matching "${query}")`;
    } else if (query.length > 0 && ct === totalCt) {
      return `${prettyCt} transactions (matching "${query}")`;
    } else {
      return `${prettyTotalCt} transactions`;
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
      {:else if transactionsPagination.page < transactionsPagination.pagesCt}
        <button on:click={() => onClickShowMore()}>
          Load more transactions
        </button>
      {:else if transactionsPagination.page === transactionsPagination.pagesCt}
        <div class="faded">No more transactions</div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .grid.transactions {
    grid-template-areas: "gutter-l date account payee description type price gutter-r";
    grid-template-columns: var(--gutter) auto auto auto 1fr auto auto var(
        --gutter
      );
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
