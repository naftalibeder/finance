<script lang="ts">
  import { Price, Transaction } from "shared";
  import { buildTransactionsDateGroups } from "../utils";
  import { TimeChartBar, TimeChartCallout } from ".";

  export let transactions: Transaction[];

  $: latestDate = ((_date) => {
    _date.setHours(0);
    _date.setMinutes(0);
    _date.setSeconds(0);
    _date.setMilliseconds(0);
    return _date.toISOString();
  })(new Date());

  $: earliestDate = ((_date) => {
    _date.setDate(_date.getDate() - 60);
    _date.setHours(0);
    _date.setMinutes(0);
    _date.setSeconds(0);
    _date.setMilliseconds(0);
    return _date.toISOString();
  })(new Date());

  $: transactionDateGroups = buildTransactionsDateGroups(
    transactions,
    earliestDate,
    latestDate
  );

  $: maxPrice = ((_transactions: Transaction[]): Price | undefined => {
    let m = _transactions[transactions.length - 1];
    if (!m) {
      return undefined;
    }

    for (const t of _transactions) {
      if (t.price.amount > m.price.amount) {
        m = t;
      }
    }
    return m.price;
  })(transactions);

  let barHoverIndex: number | undefined;
  $: hoverItem = transactionDateGroups[barHoverIndex];
  $: isHover = hoverItem !== undefined;

  const onHoverMove = (evt: MouseEvent) => {
    const target = evt.target as HTMLElement;
    if (!target || target.tagName !== "svg") {
      return;
    }
    if (transactionDateGroups.length === 0) {
      return;
    }

    const containerRect = target.getBoundingClientRect();
    const containerPosX = containerRect.x;
    const containerWidth = containerRect.width;
    // @ts-ignore
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

  const onHoverLeave = (evt: MouseEvent) => {
    barHoverIndex = undefined;
  };
</script>

<div class="container">
  <svg
    width="100%"
    height="40"
    overflow="visible"
    role="table"
    on:mousemove={onHoverMove}
    on:mouseout={onHoverLeave}
    on:focus={() => {}}
    on:blur={() => {}}
  >
    {#each transactionDateGroups as item}
      {#if item}
        <TimeChartBar {item} {maxPrice} faded={isHover} />
      {/if}
    {/each}

    {#if hoverItem}
      <TimeChartBar item={hoverItem} {maxPrice} faded={false} />
    {/if}

    <line
      class="axis"
      x1="0%"
      y1="50%"
      x2="100%"
      y2="50%"
      stroke-width="1"
      opacity="0.5"
      pointer-events="none"
    />
  </svg>

  {#if transactionDateGroups.length > 0}
    <svg width="100%" height="20" overflow="visible">
      {#if isHover}
        <TimeChartCallout item={hoverItem} />
      {/if}
    </svg>
  {/if}
</div>

<style>
  .container {
    display: grid;
    height: 40px;
    padding: 0px calc(var(--gutter) + 8px);
  }

  line.axis {
    stroke: var(--text-gray-900);
  }
</style>
