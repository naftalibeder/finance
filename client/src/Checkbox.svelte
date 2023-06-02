<script lang="ts">
  export let active: boolean;
  export let onClick: () => void;
</script>

<button class="icon" on:click={onClick}>
  {active ? "[x]" : "[ ]"}
</button>

<style>
  button.icon {
    margin: 0px;
    padding: 0px;
    outline: none;
  }
</style>
