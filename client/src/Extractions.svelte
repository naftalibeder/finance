<script lang="ts">
  import { Account, Extraction } from "shared";
  import { ExtractionItem } from ".";

  export let extractions: Extraction[];
  export let accounts: Account[];

  $: extractionsReversed = [...extractions].reverse();

  let expandedIndex: number | undefined;
</script>

<div class="container">
  <h2>Extraction history</h2>
  <div class="list">
    {#each extractionsReversed as extraction, i}
      <ExtractionItem
        {extraction}
        {accounts}
        isExpanded={i === expandedIndex}
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
</div>

<style>
  .container {
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    padding: 32px;
    height: 500px;
    overflow-y: scroll;
  }
</style>
