<script lang="ts">
  import { Price } from "shared";
  import { TransactionDateGroup } from "../types";

  export let item: TransactionDateGroup;
  export let transactionsOverallMaxPrice: Price;
  export let faded: boolean;

  const barWidth = 1.2;
  $: barOpacity = faded ? 0.5 : 1;

  const percentFromSum = (sum: number): number => {
    const ratio = sum / transactionsOverallMaxPrice.amount;
    const absRatio = Math.abs(ratio);
    const skewedRatio = (1.2 / (1 + Math.pow(Math.E, -absRatio)) - 0.5) * 2;
    return (skewedRatio * 100) / 2;
  };

  let posSum = 0;
  let negSum = 0;
  let posBarHeightPercent: number;
  let negBarHeightPercent: number;

  $: {
    posSum = 0;
    negSum = 0;
    for (const t of item.transactions) {
      const amount = t.price.amount;
      if (amount >= 0) {
        posSum += amount;
      } else {
        negSum += amount;
      }
    }
    posBarHeightPercent = percentFromSum(posSum);
    negBarHeightPercent = percentFromSum(negSum);
  }
</script>

{#if posSum > 0}
  <rect
    class="pos"
    id={item.date}
    x={`${item.ratioAlongRange * 100}%`}
    y={`${50 - posBarHeightPercent}%`}
    rx={barWidth / 2}
    width={barWidth}
    height={`${posBarHeightPercent}%`}
    opacity={barOpacity}
    style="pointer-events: none"
  />
{/if}

{#if negSum < 0}
  <rect
    class="neg"
    id={item.date}
    x={`${item.ratioAlongRange * 100}%`}
    y={`50%`}
    rx={barWidth / 2}
    width={barWidth}
    height={`${negBarHeightPercent}%`}
    opacity={barOpacity}
    style="pointer-events: none"
  />
{/if}

<style>
  rect.pos {
    fill: var(--text-gray-100);
  }

  rect.neg {
    fill: var(--text-red);
  }
</style>
