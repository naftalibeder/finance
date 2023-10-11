<script lang="ts">
  import { Bank, BankCreds } from "shared";
  import { BankCredsItem, Icon } from ".";

  type Item = {
    bankId?: string;
    exists: boolean;
  };

  export let banks: Bank[];
  export let bankCredsExistMap: Record<string, boolean>;
  export let onClickSubmitBankCreds: (
    bankId: string,
    creds: BankCreds
  ) => Promise<void>;

  let showAddedItem = false;

  $: items = ((): Item[] => {
    let items: Item[] = [];
    for (const [bankId, exists] of Object.entries(bankCredsExistMap)) {
      items.push({ bankId, exists });
    }
    if (showAddedItem) {
      items.push({ bankId: undefined, exists: false });
    }
    return items;
  })();

  const onClickCreate = async () => {
    showAddedItem = true;
  };

  const _onClickSubmit = async (bankId: string, creds: BankCreds) => {
    await onClickSubmitBankCreds(bankId, creds);
    showAddedItem = false;
  };
</script>

<div class="container">
  <div class="section">
    <h3>Bank credentials</h3>
    <button
      class="add"
      on:click={() => {
        onClickCreate();
      }}
    >
      <Icon kind="plus" />
    </button>
  </div>

  <div class="list">
    {#each items as item}
      <BankCredsItem
        {banks}
        initialBankId={item.bankId}
        credsExist={item.exists}
        onClickSubmit={async (creds) => {
          _onClickSubmit(item.bankId, creds);
        }}
      />
    {/each}
  </div>
</div>

<style>
  .container {
    display: grid;
    grid-template-rows: auto 1fr;
    grid-template-columns: 1fr;
    row-gap: 16px;
  }

  .section {
    display: grid;
    grid-template-columns: auto auto;
    align-items: center;
    justify-content: start;
    column-gap: 8px;
  }

  .list {
    display: grid;
    row-gap: 24px;
  }
</style>
