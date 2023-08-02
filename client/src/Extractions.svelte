<script lang="ts">
  import { Account, Extraction } from "shared";
  import { ExtractionItem } from ".";

  export let extractions: Extraction[];
  export let accounts: Account[];

  $: extractionsReversed = [...extractions].reverse();

  let expandedIndex: number | undefined = 0;
</script>

<div class="container">
  <div class="scroll">
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
