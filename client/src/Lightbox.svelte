<script lang="ts">
  export let onPressDismiss: () => void;

  let containerRef: HTMLDivElement;

  const onClickBg = (evt: MouseEvent) => {
    if (evt.target === containerRef) {
      onPressDismiss();
    }
  };
</script>

<div
  class="container"
  on:click={onClickBg}
  on:keypress={() => {}}
  bind:this={containerRef}
>
  <div class="box">
    <slot />
  </div>
</div>

<style>
  .container {
    position: fixed;
    width: 100%;
    top: 0px;
    bottom: 0px;
    left: 0px;
    right: 0px;
    display: grid;
    grid-template-columns: 1fr 3fr 1fr;
    grid-template-rows: 1fr auto 1fr;
    background-color: rgba(0, 0, 0, 0.5);
  }

  .box {
    grid-column: 2;
    grid-row: 2;
    background-color: var(--text-gray-800);
    overflow-y: scroll;
    max-height: 500px;
    cursor: default;
  }
</style>
