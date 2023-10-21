<script lang="ts">
  import { Account, Transaction } from "shared";
  import { prettyCurrency, prettyDate, msAgo } from "../utils";
  import { Icon } from ".";

  export let transaction: Transaction;
  export let account: Account | undefined;

  $: isNegative = transaction.price.amount < 0;
  $: prettyPrice = prettyCurrency(transaction.price);
  $: isRecent = msAgo(transaction._createdAt) < 1000 * 60 * 60;
</script>

<div class={"grid contents"}>
  <div class="cell date">
    {prettyDate(transaction.date)}
  </div>

  {#if account?.display && account.display.length > 0}
    <div class="cell account">
      {account.display}
    </div>
  {/if}

  {#if transaction.payee && transaction.payee.length > 0}
    <div class="cell payee">
      {transaction.payee}
    </div>
  {/if}

  {#if transaction.description && transaction.description.length > 0}
    <div class="cell description">
      {transaction.description}
    </div>
  {/if}

  {#if transaction.type && transaction.type.length > 0}
    <div class="cell type">
      {transaction.type}
    </div>
  {/if}

  <div class={`cell price ${isNegative ? "neg" : ""}`}>
    {prettyPrice}
  </div>

  {#if isRecent}
    <div class="cell gutter-r">
      <Icon kind="dot" size="small" />
    </div>
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
    justify-content: end;
  }

  .price.neg {
    color: var(--text-red);
  }
</style>
