<script lang="ts">
  import { Price, Transaction } from "shared";
  import { TransactionsByDate } from "../types";
  import { buildTransactionsByDateArray, prettyDate } from "../utils";
  import TimeChartBar from "./TimeChartBar.svelte";

  export let transactions: Transaction[];
  export let transactionsOverallMaxPrice: Price;
  export let transactionsOverallEarliestDate: string;

  let transactionsByDate: TransactionsByDate[] = [];
  $: {
    const res = buildTransactionsByDateArray(
      transactions,
      transactionsOverallEarliestDate
    );
    transactionsByDate = res.list;
  }

  let barHoverIndex: number | undefined;
  $: isHover = barHoverIndex !== undefined;

  const onHoverMove = (evt: MouseEvent) => {
    const target = evt.target as HTMLElement;
    if (!target || target.tagName !== "svg") {
      return;
    }

    const containerRect = target.getBoundingClientRect();
    const containerPosX = containerRect.x;
    const containerWidth = containerRect.width;
    //@ts-ignore
    const hoverPosX = evt.layerX - containerPosX;
    const ratio = hoverPosX / containerWidth;

    let min = 1;
    let minIndex = 0;
    transactionsByDate.forEach((item, i) => {
      const distance = Math.abs(item.ratioAlongRange - ratio);
      if (distance < min) {
        min = distance;
        minIndex = i;
      }
    });
    barHoverIndex = minIndex;
  };
</script>

<div class="container">
  <svg
    width="100%"
    height="40"
    on:mousemove={onHoverMove}
    on:mouseleave={() => {
      barHoverIndex = undefined;
    }}
    on:focus={() => {}}
  >
    {#each transactionsByDate as item, i}
      <TimeChartBar {item} {transactionsOverallMaxPrice} faded={isHover} />
    {/each}
    {#if isHover}
      <TimeChartBar
        item={transactionsByDate[barHoverIndex]}
        {transactionsOverallMaxPrice}
        faded={false}
      />
    {/if}
    <line
      x1="0%"
      y1="50%"
      x2="100%"
      y2="50%"
      stroke="white"
      stroke-width="1"
      opacity="0.5"
    />
  </svg>
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
    flex: 1;
    flex-direction: column;
    padding: 0px var(--gutter);
  }

  .labels-holder {
    display: flex;
    flex: auto;
    flex-direction: row;
    justify-content: space-between;
    margin-top: 12px;
  }
</style>
