<script lang="ts">
  import { Account, Bank, Extraction } from "shared";
  import { prettyCurrency, prettyTimeAgo } from "../utils";
  import { Icon } from ".";

  export let account: Account;
  export let bank: Bank | undefined;
  export let hasCredsForBank: boolean;
  export let extraction: Extraction | undefined;
  export let onClickAccount: () => void;
  export let onClickExtract: () => void;

  $: displayName = account.display.length > 0 ? account.display : "New Account";
  $: bankDisplayName = bank?.displayName ?? "No bank selected";
  $: allowHideExtractionStatus = hasCredsForBank && !extraction;
</script>

<div class="grid contents">
  <button class="cell name" on:click={() => onClickAccount()}>
    {displayName}
  </button>
  <button
    class={`cell bank ${hasCredsForBank ? "" : "faded"}`}
    on:click={() => onClickAccount()}
  >
    {bankDisplayName}
  </button>
  <div class={`cell price ${account.price.amount < 0 ? "neg" : ""}`}>
    {prettyCurrency(account.price)}
  </div>
  <div class={`cell gutter-r ${allowHideExtractionStatus ? "hidden" : ""}`}>
    {#if !hasCredsForBank}
      <div style="color: var(--text-red)">
        <Icon kind="dot" size="small" />
      </div>
    {:else if extraction && !extraction.startedAt}
      <div>
        <Icon kind="dot" size="small" />
      </div>
    {:else if extraction && !extraction.finishedAt}
      <div class="spin">
        <Icon kind="reload" size="small" />
      </div>
    {:else}
      <button class="refresh hover-fade" on:click={() => onClickExtract()}>
        <Icon kind="reload" size="small" />
      </button>
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
    justify-content: end;
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

  @keyframes rotate {
    from {
      rotate: 360deg;
    }
  }

  .spin {
    animation: rotate 1s infinite linear reverse;
  }
</style>
