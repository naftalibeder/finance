<script lang="ts">
  import { Account, Extraction } from "shared";
  import { prettyDate, prettyDurationBetweenDates } from "../utils";

  export let extractions: Extraction[];
  export let accounts: Account[];
  export let isExpanded = false;
  export let now: Date;
  export let onClickToggleExpand: () => void;

  $: sectionDateDisplay = prettyDate(extractions[0].queuedAt, {
    includeTime: "hr:min",
  });

  const accountDisplay = (e: Extraction) => {
    return accounts.find((o) => o._id === e.accountId)?.display;
  };

  const durationDisplay = (e: Extraction, now: Date): string | undefined => {
    if (e.finishedAt) {
      return prettyDurationBetweenDates(e.startedAt, e.finishedAt);
    } else if (e.startedAt) {
      return prettyDurationBetweenDates(e.startedAt, now);
    } else {
      return undefined;
    }
  };

  const statusDisplay = (e: Extraction) => {
    if (e.error) {
      return e.error;
    } else if (e.finishedAt) {
      return "Complete";
    } else if (e.startedAt) {
      return "In progress";
    } else {
      return "Pending";
    }
  };
</script>

<div>
  <button on:click={onClickToggleExpand}>
    <h3 class="section">
      {sectionDateDisplay}
    </h3>
  </button>

  {#if isExpanded}
    <div class="list">
      <div class="cell faded">Account</div>
      <div class="cell faded">Found</div>
      <div class="cell faded">New</div>
      <div class="cell faded">Duration</div>
      <div class="cell faded">Status</div>

      {#each extractions as e}
        <div class="cell">{accountDisplay(e)}</div>
        <div class="cell">{e.foundCt}</div>
        <div class="cell">{e.addCt}</div>
        {#if e.startedAt}
          <div class="cell">{durationDisplay(e, now)}</div>
        {:else}
          <div class="cell faded">{"N/A"}</div>
        {/if}
        <div class="cell">
          {#if e.error}
            <button on:click={() => alert(e.error)}>Error</button>
          {:else}
            {statusDisplay(e)}
          {/if}
        </div>
      {/each}
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
    cursor: pointer;
  }
</style>
