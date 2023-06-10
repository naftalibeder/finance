<script lang="ts">
  import { Account, ExtractionStatus } from "shared";
  import { prettyCurrency, prettyTimeAgo, secAgo } from "../utils";

  export let account: Account;
  export let extractionStatus: ExtractionStatus["accounts"][string] | undefined;
  export let onClickExtract: (accountIds?: string[]) => void;

  $: isRecent = secAgo(account._createdAt) < 60 * 60;
  $: isAlwaysVisible = extractionStatus !== undefined;
</script>

<div class="grid contents">
  <div class="cell account name">
    {account.display}
  </div>
  <div class={`cell account price ${account.price.amount < 0 ? "neg" : ""}`}>
    {prettyCurrency(account.price)}
  </div>
  <div class={`cell account gutter-r ${!isAlwaysVisible ? "hidden" : ""}`}>
    {#if extractionStatus}
      <div>•</div>
    {:else}
      <button class="refresh" on:click={() => onClickExtract([account._id])}>
        ↻
      </button>
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
</style>
