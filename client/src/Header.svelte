<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { Icon } from ".";

  export let onQueryChanged: (query: string) => void;
  export let onClickExtractionsHistory: () => void;
  export let onClickSettings: () => void;

  let isSearchFocused = false;
  let searchInputFieldRef: HTMLInputElement;
  let searchTimer: NodeJS.Timer | undefined;

  let searchPlaceholderText = ((_isFocused: boolean) => {
    if (!_isFocused) {
      return "Search (⌘K)";
    } else {
      const options: string[] = [
        "coffee",
        ">250 <350",
        "<15.20",
        ">2000",
        "~10",
      ];
      const randIndex = Math.floor(Math.random() * options.length);
      const randOption = options[randIndex];
      return `E.g. ${randOption}`;
    }
  })(isSearchFocused);

  let query = "";
  $: {
    _onQueryChanged(query);
  }

  const _onQueryChanged = async (_query: string) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
      onQueryChanged(_query.trim());
    }, 100);
  };

  const onKeyPress = (evt: KeyboardEvent) => {
    if (evt.metaKey && evt.key === "k") {
      evt.preventDefault();
      searchInputFieldRef.focus();
    } else if (evt.key === "Escape") {
      evt.preventDefault();
      searchInputFieldRef.value = "";
      query = "";
      searchInputFieldRef.blur();
    }
  };

  onMount(async () => {
    document.addEventListener("keydown", onKeyPress);
  });

  onDestroy(() => {
    document.removeEventListener("keydown", onKeyPress);
  });
</script>

<div class="header">
  <a class="title" href="/"><h1>Finance</h1></a>
  <input
    placeholder={searchPlaceholderText}
    bind:this={searchInputFieldRef}
    bind:value={query}
    on:focus={() => (isSearchFocused = true)}
    on:blur={() => (isSearchFocused = false)}
  />
  <button on:click={() => onClickExtractionsHistory()}>
    <Icon kind={"clock"} />
  </button>
  <button on:click={() => onClickSettings()}>
    <Icon kind={"menu"} />
  </button>
</div>

<style>
  .header {
    display: grid;
    grid-template-columns: 2fr 1fr auto auto;
    column-gap: 16px;
    align-items: center;
    padding: 0px calc(var(--gutter) + 8px);
    margin-bottom: 32px;
  }

  a.title {
    all: unset;
    cursor: pointer;
  }
</style>
