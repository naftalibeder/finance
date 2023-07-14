<script lang="ts">
  import { UUID } from "crypto";
  import { Transaction, Price, Account } from "shared";
  import { prettyCurrency, prettyNumber } from "../utils";
  import { TransactionDateGroup } from "../types";
  import { TransactionsListItem } from ".";

  export let transactions: Transaction[];
  export let transactionsSumPrice: Price;
  export let transactionsCt: number;
  export let transactionsOverallCt: number;
  export let activeGroup: TransactionDateGroup | undefined;
  export let query: string;
  export let accountsDict: Record<UUID, Account>;

  const limit = 200;

  $: sectionText = buildSectionText(
    transactionsCt,
    transactionsOverallCt,
    query,
    activeGroup
  );

  const buildSectionText = (
    ct: number,
    overallCt: number,
    query: string,
    group?: TransactionDateGroup
  ): string => {
    if (group) {
      return `${group.transactions.length} of ${overallCt} transactions`;
    } else {
      let base: string;
      if (ct === overallCt) {
        base = `${prettyNumber(overallCt)} transactions`;
      } else {
        base = `${prettyNumber(ct)} of ${prettyNumber(overallCt)} transactions`;
      }

      if (query.length > 0) {
        return `${base} (matching "${query}")`;
      } else {
        return base;
      }
    }
  };

  $: sumPriceDisp = buildSumPriceDisp(transactionsSumPrice, activeGroup);

  const buildSumPriceDisp = (
    sumPrice: Price,
    group?: TransactionDateGroup
  ): string => {
    if (group) {
      const sum = activeGroup.transactions.reduce(
        (a, c) => a + c.price.amount,
        0
      );
      return prettyCurrency({
        amount: sum,
        currency: "USD",
      });
    } else {
      return prettyCurrency(sumPrice);
    }
  };
</script>

<div class="section">
  <div class="grid transactions">
    <div class="grid contents tall">
      <div class="cell transaction-section title">
        {sectionText}
      </div>
      <div class="cell transaction-section action">
        {sumPriceDisp}
      </div>
    </div>

    {#if activeGroup}
      {#each activeGroup.transactions as t}
        <TransactionsListItem
          transaction={t}
          account={accountsDict[t.accountId]}
        />
      {/each}
    {:else}
      {#each transactions.slice(0, limit) as t}
        <TransactionsListItem
          transaction={t}
          account={accountsDict[t.accountId]}
        />
      {/each}
    {/if}
  </div>
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
    justify-content: flex-end;
  }
</style>
