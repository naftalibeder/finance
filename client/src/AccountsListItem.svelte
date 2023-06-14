<script lang="ts">
  import { UUID } from "crypto";
  import { Account, ExtractionStatus } from "shared";
  import { prettyCurrency, prettyTimeAgo } from "../utils";

  export let account: Account;
  export let extractionStatus:
    | ExtractionStatus["accounts"][string]
    | undefined = undefined;
  export let onClickAccount: () => void;
  export let onClickExtract: () => void;

  $: displayName = ((a: Account) => {
    if (a._pending) {
      return a.display.length > 0 ? a.display : "New Account";
    } else {
      return a.display;
    }
  })(account);

  $: allowHideExtractionStatus =
    !account._pending && extractionStatus === undefined;
</script>

<div class="grid contents">
  <button class="cell account name" on:click={() => onClickAccount()}>
    {displayName}
  </button>
  <div class={`cell account price ${account.price.amount < 0 ? "neg" : ""}`}>
    {prettyCurrency(account.price)}
  </div>
  <div
    class={`cell account gutter-r ${allowHideExtractionStatus ? "hidden" : ""}`}
  >
    {#if account._pending}
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
