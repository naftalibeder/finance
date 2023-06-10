<script lang="ts">
  import { TransactionDateGroup } from "../types";
  import { prettyCurrency, prettyDate } from "../utils";

  export let item: TransactionDateGroup;

  let posSum = 0;
  let negSum = 0;

  let posCt = 0;
  let negCt = 0;

  $: {
    posSum = 0;
    negSum = 0;

    posCt = 0;
    negCt = 0;

    for (const t of item.transactions) {
      const amount = t.price.amount;
      if (amount >= 0) {
        posSum += amount;
        posCt += 1;
      } else {
        negSum += amount;
        negCt += 1;
      }
    }
  }

  $: posX = item.ratioAlongRange * 100;

  $: dateDisp = prettyDate(item.date);
  $: posSumDisp = `${prettyCurrency({ amount: posSum, currency: "USD" })}`;
  $: negSumDisp = `${prettyCurrency({ amount: -negSum, currency: "USD" })}`;
</script>

<svg x={`${posX}%`} overflow="visible">
  <text>
    <tspan
      y="0"
      text-anchor="middle"
      dominant-baseline="hanging"
      class="default"
    >
      {dateDisp}
    </tspan>
  </text>
  {#each [{ isPos: true, y: 20, class: "default" }, { isPos: false, y: 40, class: "red" }] as item}
    <text>
      <tspan
        dx="-50"
        y={item.y}
        text-anchor="start"
        dominant-baseline="hanging"
        class={item.class}
      >
        {item.isPos ? "+" : "-"}
      </tspan>
    </text>
    <text>
      <tspan
        dx="50"
        y={item.y}
        text-anchor="end"
        dominant-baseline="hanging"
        class={item.class}
      >
        {item.isPos ? posSumDisp : negSumDisp}
      </tspan>
    </text>
  {/each}
</svg>

<style>
  tspan.default {
    fill: var(--text-gray-100);
  }

  tspan.red {
    fill: var(--text-red);
  }
</style>
