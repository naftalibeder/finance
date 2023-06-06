<script lang="ts">
  import { TransactionsByDate } from "../types";
  import { prettyDate } from "../utils";

  export let transactionsByDate: TransactionsByDate[];
</script>

<div class="container">
  <div class="bars-holder">
    {#each transactionsByDate as item}
      <div
        class={`bar ${item.transactions.length === 0 ? "empty" : ""}`}
        style={`height: ${item.transactions.length * 10}%`}
      />
    {/each}
  </div>
  {#if transactionsByDate.length > 0}
    <div class="labels-holder">
      <div class="faded">
        {prettyDate(transactionsByDate[0].date) ?? "-"}
      </div>
      <div class="faded">
        {prettyDate(transactionsByDate[transactionsByDate.length - 1].date) ??
          "-"}
      </div>
    </div>
  {/if}
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    padding: 0px 40px;
    row-gap: 12px;
  }
  .bars-holder {
    display: flex;
    flex: auto;
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-end;
    height: 40px;
  }
  .bar {
    display: flex;
    flex: 1;
    max-width: 2px;
    background-color: white;
  }
  .bar.empty {
    background-color: transparent;
  }
  .bar:hover {
    opacity: 0.6;
  }
  .labels-holder {
    display: flex;
    flex: auto;
    flex-direction: row;
    justify-content: space-between;
  }
</style>
