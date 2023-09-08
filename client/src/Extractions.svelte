<script lang="ts">
  import { Account, Extraction } from "shared";
  import { ExtractionItem } from ".";
  import { onDestroy, onMount } from "svelte";

  export let extractions: Extraction[];
  export let accounts: Account[];

  $: extractionsGrouped = ((_extractions: Extraction[]): Extraction[][] => {
    const copy = extractions.slice();
    const reversed = copy.reverse();

    const grouped: Extraction[][] = [];
    let lastAddedDate: Date | undefined;
    for (const extraction of reversed) {
      const date = new Date(extraction.queuedAt);

      if (!lastAddedDate) {
        grouped.push([extraction]);
        lastAddedDate = date;
        continue;
      }

      const deltaMs = Math.abs(date.valueOf() - lastAddedDate.valueOf());
      if (deltaMs < 1000 * 30) {
        grouped[grouped.length - 1].push(extraction);
        continue;
      }

      grouped.push([extraction]);
      lastAddedDate = date;
    }

    return grouped;
  })(extractions);

  let expandedIndex: number | undefined = 0;

  let now = new Date();
  let nowInterval: NodeJS.Timeout;

  onMount(() => {
    nowInterval = setInterval(() => {
      now = new Date();
    }, 1000);
  });

  onDestroy(() => {
    clearInterval(nowInterval);
  });
</script>

<div class="container">
  <h2>Extraction history</h2>
  {#if extractionsGrouped.length > 0}
    <div class="list">
      {#each extractionsGrouped as group, i}
        <ExtractionItem
          extractions={group}
          {accounts}
          isExpanded={i === expandedIndex}
          {now}
          onClickToggleExpand={() => {
            if (i === expandedIndex) {
              expandedIndex = undefined;
            } else {
              expandedIndex = i;
            }
          }}
        />
      {/each}
    </div>
  {:else}
    <div class="faded">No previous extractions.</div>
  {/if}
</div>

<style>
  .container {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: 1fr;
    padding: 16px;
  }

  .list {
    display: grid;
    grid-template-rows: auto 1fr;
  }
</style>
