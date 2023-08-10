<script lang="ts">
  import { Account, Transaction } from "shared";
  import { prettyCurrency, prettyDate, secAgo } from "../utils";
  import { Icon } from ".";

  export let transaction: Transaction;
  export let account: Account | undefined;

  $: isRecent = secAgo(transaction._createdAt) < 60 * 60;
</script>

<div class={"grid contents"}>
  <div class="cell date">
    {prettyDate(transaction.date)}
  </div>
  <div class="cell account">{account?.display ?? ""}</div>
  <div class="cell payee">{transaction.payee}</div>
  <div class="cell description">{transaction.description}</div>
  <div class="cell type">{transaction.type}</div>
  <div class={`cell price ${transaction.price.amount < 0 ? "neg" : ""}`}>
    {prettyCurrency(transaction.price)}
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
    justify-content: flex-end;
  }

  .price.neg {
    color: var(--text-red);
  }
</style>
