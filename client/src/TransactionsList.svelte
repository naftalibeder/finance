<script lang="ts">
  import { Transaction, Price } from "shared";
  import { prettyCurrency, prettyDate, secAgo } from "../utils";

  export let transactions: Transaction[];
  export let transactionsFilteredSum: Price;
  export let transactionsFilteredCt: number;
  export let transactionsTotalCt: number;
  export let query: string;

  let transactionsSectionText = "";
  $: {
    let baseSectionText = "";
    if (transactionsFilteredCt === transactionsTotalCt) {
      baseSectionText = `${transactionsTotalCt} transactions`;
    } else {
      baseSectionText = `${transactionsFilteredCt} of ${transactionsTotalCt} transactions`;
    }
    if (query.length > 0) {
      transactionsSectionText = `${baseSectionText} (matching "${query}")`;
    } else {
      transactionsSectionText = baseSectionText;
    }
  }
</script>

<div class="section">
  <div class="grid transactions">
    <div class="grid contents tall">
      <div class="cell transaction-section title">
        {transactionsSectionText}
      </div>
      <div class="cell transaction-section action">
        {prettyCurrency(transactionsFilteredSum)}
      </div>
    </div>

    {#each transactions as t}
      <div
        class={`grid contents ${secAgo(t._createdAt) < 60 * 5 ? "recent" : ""}`}
      >
        <div class="cell transaction date">
          {prettyDate(t.date, { includeTime: false })}
        </div>
        <div class="cell transaction account">{t.accountId}</div>
        <div class="cell transaction payee">{t.payee}</div>
        <div class="cell transaction description">{t.description}</div>
        <div class="cell transaction type">{t.type}</div>
        <div class="cell transaction price">
          {prettyCurrency(t.price)}
        </div>
        <!-- <div class="cell transaction timestamp">
          {prettyDate(t.createdAt, { includeTime: true })}
        </div> -->
      </div>
    {/each}
  </div>
</div>

<style>
  .grid.transactions {
    grid-template-areas: "gutter-l date account payee description type price gutter-r";
    grid-template-columns: var(--gutter) auto 1fr 2fr 1fr 1fr auto var(--gutter);
  }

  .cell.transaction-section.title {
    grid-column: date / type;
  }

  .cell.transaction-section.action {
    grid-column: price;
    justify-content: flex-end;
  }

  .cell.transaction.date {
    grid-column-start: date;
    padding-right: 12px;
  }

  .cell.transaction.account {
    grid-column-start: account;
  }

  .cell.transaction.description {
    grid-column-start: description;
  }

  .cell.transaction.type {
    grid-column-start: type;
  }

  .cell.transaction.payee {
    grid-column-start: payee;
  }

  .cell.transaction.price {
    grid-column-start: price;
    justify-content: flex-end;
  }
</style>
