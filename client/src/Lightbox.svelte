<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { Icon } from ".";

  export let title: string;
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

<button
  class="lightbox-container"
  on:click={onClickBg}
  bind:this={containerRef}
>
  <div class="lightbox">
    <div class="lightbox-header">
      <h2 class="title">{title}</h2>
      <button class="close-button" on:click={() => onPressDismiss()}>
        <Icon kind={"x"} />
      </button>
    </div>
    <div class="scroll-area">
      <slot />
    </div>
  </div>
</button>

<style>
  .lightbox-container {
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

  .lightbox {
    display: grid;
    grid-column: 2;
    grid-row: 2;
    grid-template-rows: auto 1fr;
    row-gap: 32px;
    padding: 32px;
    background-color: white;
    cursor: default;
    overflow-y: auto;
  }

  .lightbox-header {
    display: grid;
    grid-template-columns: 1fr auto;
  }

  .title {
    margin: 0px;
  }

  .close-button {
    align-items: center;
  }

  .scroll-area {
    display: grid;
    overflow-y: scroll;
  }
</style>
