<script lang="ts">
  import { onDestroy, onMount } from "svelte";

  export let onPressDismiss: () => void;

  let containerRef: HTMLButtonElement;

  const onClickBg = (evt: MouseEvent) => {
    if (evt.target === containerRef) {
      onPressDismiss();
    }
  };

  const onKeyPress = (evt: KeyboardEvent) => {
    if (evt.code === "Escape") {
      onPressDismiss();
    }
  };

  onMount(() => {
    addEventListener("keydown", onKeyPress);
  });

  onDestroy(() => {
    removeEventListener("keydown", onKeyPress);
  });
</script>

<button class="container" on:click={onClickBg} bind:this={containerRef}>
  <div class="box">
    <div class="box-inner">
      <slot />
    </div>
  </div>
</button>

<style>
  .container {
    all: unset;
    position: fixed;
    top: 0px;
    bottom: 0px;
    left: 0px;
    right: 0px;
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 32px 1fr 32px;
    grid-template-rows: 32px 1fr 32px;
    background-color: rgba(0, 0, 0, 0.2);
  }

  .box {
    display: grid;
    grid-column: 2;
    grid-row: 2;
    padding: 16px;
    background-color: white;
    cursor: default;
    overflow-y: auto;
  }

  .box-inner {
    display: grid;
    overflow-y: scroll;
  }
</style>
