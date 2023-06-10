<script lang="ts">
  import { Transaction } from "shared";
  import { prettyCurrency, prettyDate, secAgo } from "../utils";

  export let transaction: Transaction;

  $: isRecent = secAgo(transaction._createdAt) < 60 * 60;
</script>

<div class={"grid contents"}>
  <div class="cell transaction date">
    {prettyDate(transaction.date, { includeTime: false })}
  </div>
  <div class="cell transaction account">{transaction.accountId}</div>
  <div class="cell transaction payee">{transaction.payee}</div>
  <div class="cell transaction description">{transaction.description}</div>
  <div class="cell transaction type">{transaction.type}</div>
  <div
    class={`cell transaction price ${
      transaction.price.amount < 0 ? "neg" : ""
    }`}
  >
    {prettyCurrency(transaction.price)}
  </div>
  {#if isRecent}
    <div class="cell gutter-r">•</div>
  {/if}
</div>

<style>
  .date {
    grid-column-start: date;
    padding-right: 12px;
  }

  .account {
    grid-column-start: account;
    padding-right: 12px;
  }

  .payee {
    grid-column-start: payee;
    padding-right: 12px;
  }

  .description {
    grid-column-start: description;
    padding-right: 12px;
  }

  .type {
    grid-column-start: type;
    padding-right: 12px;
  }

  .price {
    grid-column-start: price;
    justify-content: flex-end;
  }

  .price.neg {
    color: var(--text-red);
  }
</style>
