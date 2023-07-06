<script lang="ts">
  import { Account, Bank, ExtractionStatus } from "shared";
  import { prettyCurrency, prettyTimeAgo } from "../utils";

  export let account: Account;
  export let bank: Bank | undefined;
  export let extractionStatus:
    | ExtractionStatus["accounts"][string]
    | undefined = undefined;
  export let onClickAccount: () => void;
  export let onClickExtract: () => void;

  $: displayName = account.display.length > 0 ? account.display : "New Account";
  $: bankDisplayName = bank?.displayName ?? "No bank selected";
  $: allowHideExtractionStatus = account.bankHasCreds && !extractionStatus;
</script>

<div class="grid contents">
  <button class="cell name" on:click={() => onClickAccount()}>
    {displayName}
  </button>
  <button
    class={`cell bank ${account.bankHasCreds ? "" : "faded"}`}
    on:click={() => onClickAccount()}
  >
    {bankDisplayName}
  </button>
  <div class={`cell price ${account.price.amount < 0 ? "neg" : ""}`}>
    {prettyCurrency(account.price)}
  </div>
  <div class={`cell gutter-r ${allowHideExtractionStatus ? "hidden" : ""}`}>
    {#if !account.bankHasCreds}
      <div style="color: var(--text-red)">•</div>
    {:else if extractionStatus === "pending"}
      <div>•</div>
    {:else if extractionStatus === "in-progress"}
      <div class="pulse">•</div>
    {:else}
      <button class="refresh" on:click={() => onClickExtract()}> ↻ </button>
      <div class="timestamp">{prettyTimeAgo(account._updatedAt)}</div>
    {/if}
  </div>
</div>

<style>
  .name {
    grid-column-start: name;
  }

  .bank {
    grid-column-start: bank;
  }

  .price {
    grid-column-start: price;
    justify-content: flex-end;
  }

  .price.neg {
    color: var(--text-red);
  }

  .gutter-r.hidden {
    opacity: 0;
  }

  .grid.contents:hover .gutter-r {
    opacity: 0.5;
  }

  .refresh:hover {
    opacity: 0.35;
  }

  .timestamp {
    margin-left: 6px;
  }

  .pulsing {
    transition: opacity 0.5 repeat;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
  }

  .pulse {
    animation: fade-in 1s infinite alternate;
  }
</style>
