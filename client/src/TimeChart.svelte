<script lang="ts">
  import { Price, Transaction } from "shared";
  import { TransactionDateGroup } from "../types";
  import { buildTransactionsDateGroups, prettyDate } from "../utils";
  import TimeChartBar from "./TimeChartBar.svelte";
  import TimeChartInfo from "./TimeChartInfo.svelte";

  export let transactions: Transaction[];
  export let transactionsOverallMaxPrice: Price;
  export let transactionsOverallEarliestDate: string;

  let transactionDateGroups: TransactionDateGroup[] = [];
  $: {
    transactionDateGroups = buildTransactionsDateGroups(
      transactions,
      transactionsOverallEarliestDate
    );
  }

  $: earliestDate = new Date(transactionsOverallEarliestDate);
  $: latestDate = new Date();

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
    transactionDateGroups.forEach((item, i) => {
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
    height="60"
    overflow="visible"
    on:mousemove={onHoverMove}
    on:mouseleave={() => {
      barHoverIndex = undefined;
    }}
    on:focus={() => {}}
  >
    {#each transactionDateGroups as item, i}
      <TimeChartBar {item} {transactionsOverallMaxPrice} faded={isHover} />
    {/each}
    {#if isHover}
      <TimeChartBar
        item={transactionDateGroups[barHoverIndex]}
        {transactionsOverallMaxPrice}
        faded={false}
      />
    {/if}
    <line
      class="axis"
      x1="0%"
      y1="50%"
      x2="100%"
      y2="50%"
      stroke-width="1"
      opacity="0.5"
    />
  </svg>
  {#if transactionDateGroups.length > 0}
    <svg width="100%" height="60" overflow="visible">
      {#if isHover}
        <TimeChartInfo item={transactionDateGroups[barHoverIndex]} />
      {:else}
        <text class="default" x="0%" text-anchor="middle">
          <tspan dominant-baseline="hanging">
            {prettyDate(earliestDate) ?? "-"}
          </tspan>
        </text>
        <text class="default" x="100%" text-anchor="middle">
          <tspan dominant-baseline="hanging">
            {prettyDate(latestDate) ?? "-"}
          </tspan>
        </text>
      {/if}
    </svg>
  {/if}
</div>

<style>
  .container {
    display: flex;
    flex: 1;
    flex-direction: column;
    padding: 0px var(--gutter);
  }

  line.axis {
    stroke: var(--text-gray-100);
  }

  text.default {
    fill: var(--text-gray-100);
  }
</style>
