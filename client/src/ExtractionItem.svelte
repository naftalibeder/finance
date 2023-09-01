<script lang="ts">
  import { Account, Extraction } from "shared";
  import { prettyDate, prettyDurationBetweenDates } from "../utils";

  export let extraction: Extraction;
  export let accounts: Account[];
  export let isExpanded = false;
  export let now: Date;
  export let onClickToggleExpand: () => void;

  const accountDisplay = (a: Extraction) => {
    return accounts.find((o) => o._id === a.accountId)?.display;
  };

  const durationDisplay = (a: Extraction, now: Date): string | undefined => {
    if (a.finishedAt) {
      return prettyDurationBetweenDates(a.startedAt, a.finishedAt);
    } else if (a.startedAt) {
      return prettyDurationBetweenDates(a.startedAt, now);
    } else {
      return undefined;
    }
  };

  const statusDisplay = (a: Extraction) => {
    if (a.finishedAt) {
      return a.error ? a.error : "Complete";
    } else if (a.startedAt) {
      return extraction.finishedAt ? "Aborted" : "In progress";
    } else {
      return extraction.finishedAt ? "Cancelled" : "Pending";
    }
  };
</script>

<div>
  <button on:click={onClickToggleExpand}>
    <h3 class="section">
      {prettyDate(extraction.queuedAt, { includeTime: "hr:min" })}
    </h3>
  </button>

  {#if isExpanded}
    <div class="list">
      <div class="cell">Account</div>
      <div class="cell">Found</div>
      <div class="cell">New</div>
      <div class="cell">Duration</div>
      <div class="cell">Status</div>

      <div class="cell">{accountDisplay(extraction)}</div>
      <div class="cell">{extraction.foundCt}</div>
      <div class="cell">{extraction.addCt}</div>
      {#if extraction.startedAt}
        <div class="cell">{durationDisplay(extraction, now)}</div>
      {:else}
        <div class="cell faded">{"N/A"}</div>
      {/if}
      <div class="cell h-scroll">{statusDisplay(extraction)}</div>
    </div>
  {/if}
</div>

<style>
  .list {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
    column-gap: 16px;
  }

  .section {
    grid-column: 1 / 6;
    margin-top: 24px;
    margin-bottom: 8px;
    cursor: pointer;
  }

  .h-scroll {
    overflow: scroll;
    white-space: nowrap;
  }
</style>
