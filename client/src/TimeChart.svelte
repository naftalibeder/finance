<script lang="ts">
  import { Transaction } from "shared";
  import { TransactionsByDate } from "../types";
  import { buildTransactionsByDateArray, prettyDate } from "../utils";

  export let transactions: Transaction[];
  export let transactionsEarliestDate: string;

  let transactionsByDate: TransactionsByDate[] = [];
  let transactionsMaxCtOnDate = 0;
  $: {
    const res = buildTransactionsByDateArray(
      transactions,
      transactionsEarliestDate
    );
    transactionsByDate = res.list;
    transactionsMaxCtOnDate = res.maxCtOnDate;
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

  const getBarPosXPercent = (i: number): number => {
    return transactionsByDate[i].ratioAlongRange * 100;
  };

  const getBarHeightPercent = (i: number): number => {
    return transactionsByDate[i].transactions.length * 10;
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
      <rect
        x={`${getBarPosXPercent(i)}%`}
        y={`${100 - getBarHeightPercent(i)}%`}
        width={1}
        height={`${getBarHeightPercent(i)}%`}
        fill="white"
        opacity={!isHover ? 1 : i === barHoverIndex ? 1 : 0.5}
        style="pointer-events: none"
      />
    {/each}
    {#if isHover}
      <rect
        x={`${getBarPosXPercent(barHoverIndex)}%`}
        y={`${100 - getBarHeightPercent(barHoverIndex)}%`}
        width={1}
        height={`${getBarHeightPercent(barHoverIndex)}%`}
        fill="white"
        style="pointer-events: none"
      />
    {/if}
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
