<script lang="ts">
  import { Account, Extraction } from "shared";
  import { ExtractionItem } from ".";
  import { onDestroy, onMount } from "svelte";

  export let extractions: Extraction[];
  export let accounts: Account[];

  let extractionsReversed: Extraction[] = [];
  $: {
    const copy = extractions.slice();
    extractionsReversed = copy.reverse();
  }

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
  <div class="scroll">
    <h2>Extraction history</h2>
    {#if extractionsReversed.length > 0}
      <div class="list">
        {#each extractionsReversed as extraction, i}
          <ExtractionItem
            {extraction}
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
</div>

<style>
  .container {
    display: grid;
    grid-template-columns: 1fr;
    padding: 8px;
  }

  .scroll {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    padding: 36px;
    height: 600px;
    overflow-y: scroll;
  }
</style>
