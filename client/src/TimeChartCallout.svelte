<script lang="ts">
  import { tick } from "svelte";
  import { TransactionDateGroup } from "../types";
  import { prettyCurrency, prettyDate } from "../utils";

  export let item: TransactionDateGroup;

  let posSum = 0;
  let negSum = 0;
  let posCt = 0;
  let negCt = 0;

  $: {
    refresh(item);
  }

  const refresh = async (_item: TransactionDateGroup) => {
    posSum = 0;
    negSum = 0;
    posCt = 0;
    negCt = 0;

    for (const t of _item.transactions) {
      const amount = t.price.amount;
      if (amount >= 0) {
        posSum += amount;
        posCt += 1;
      } else {
        negSum += amount;
        negCt += 1;
      }
    }

    await tick();

    const textWidth = textRef?.getComputedTextLength();
    boxWidth = textWidth + 32;
  };

  $: posX = item.ratioAlongRange * 100;
  $: dateDisp = prettyDate(item.date);
  $: posSumDisp = `+${prettyCurrency({ amount: posSum, currency: "USD" })}`;
  $: negSumDisp = `${prettyCurrency({ amount: negSum, currency: "USD" })}`;

  let boxWidth = 0;
  let boxHeight = 60;
  let textRef: SVGTextElement | undefined;
</script>

<svg x={`${posX}%`} y="10" overflow="visible">
  <rect
    class="container"
    x={boxWidth * -0.5}
    y="0"
    width={boxWidth}
    height={boxHeight}
  />
  <text>
    <tspan
      y="12"
      text-anchor="middle"
      dominant-baseline="hanging"
      class="default"
    >
      {dateDisp}
    </tspan>
  </text>

  <text
    bind:this={textRef}
    y={36}
    text-anchor="middle"
    dominant-baseline="hanging"
  >
    <tspan class="default">
      {posSumDisp}
    </tspan>
    <tspan dx="8" class="red">
      {negSumDisp}
    </tspan>
  </text>
</svg>

<style>
  .container {
    fill: white;
    stroke: var(--text-gray-900);
    stroke-width: 1px;
  }

  tspan.default {
    fill: var(--text-gray-900);
  }

  tspan.red {
    fill: var(--text-red);
  }
</style>
