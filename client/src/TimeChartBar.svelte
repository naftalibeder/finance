<script lang="ts">
  import { Price } from "shared";
  import { TransactionsByDate } from "../types";

  export let item: TransactionsByDate;
  export let transactionsOverallMaxPrice: Price;
  export let faded: boolean;

  const barWidth = 1.2;
  $: barOpacity = faded ? 0.8 : 1;

  const percentFromSum = (sum: number): number => {
    const ratio = sum / transactionsOverallMaxPrice.amount;
    const absRatio = Math.abs(ratio);
    const skewedRatio = Math.max(Math.tanh(absRatio * 10), 0.02);
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
    id={item.date}
    x={`${item.ratioAlongRange * 100}%`}
    y={`${50 - posBarHeightPercent}%`}
    rx={barWidth / 2}
    width={barWidth}
    height={`${posBarHeightPercent}%`}
    fill={"white"}
    opacity={barOpacity}
    style="pointer-events: none"
  />
{/if}

{#if negSum < 0}
  <rect
    id={item.date}
    x={`${item.ratioAlongRange * 100}%`}
    y={`50%`}
    rx={barWidth / 2}
    width={barWidth}
    height={`${negBarHeightPercent}%`}
    fill={"#EC4856"}
    opacity={barOpacity}
    style="pointer-events: none"
  />
{/if}
