<script lang="ts">
  import { Bank, BankCreds, User } from "shared";
  import { BankCredsItem, Icon } from ".";

  type Item = {
    bankId?: string;
    exists: boolean;
  };

  export let user: User;
  export let banks: Bank[];
  export let bankCredsExistMap: Record<string, boolean>;
  export let onClickSubmitBankCreds: (
    bankId: string,
    creds: BankCreds
  ) => Promise<void>;
  export let onClickDeleteBankCreds: (bankId: string) => Promise<void>;

  let showNewItem = false;

  $: items = ((): Item[] => {
    let items: Item[] = [];
    for (const [bankId, exists] of Object.entries(bankCredsExistMap)) {
      items.push({ bankId, exists });
    }
    if (showNewItem) {
      items.push({ bankId: undefined, exists: false });
    }
    return items;
  })();

  const onClickCreate = async () => {
    showNewItem = true;
  };

  const _onClickSubmit = async (bankId: string, creds: BankCreds) => {
    await onClickSubmitBankCreds(bankId, creds);
    showNewItem = false;
  };

  const _onClickDelete = async (bankId: string) => {
    await onClickDeleteBankCreds(bankId);
    showNewItem = false;
  };
</script>

<div class="container">
  <div class="section-group">
    <div class="section-label">
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
          onClickCancelNew={async () => {
            showNewItem = false;
          }}
          onClickSubmit={async (bankId, creds) => {
            _onClickSubmit(bankId, creds);
          }}
          onClickDelete={async (bankId) => {
            _onClickDelete(bankId);
          }}
        />
      {/each}
    </div>
  </div>

  <div class="section-group">
    <div class="section-label">
      <h3>Account</h3>
    </div>
    <div>Signed in as {user.email}.</div>
  </div>
</div>

<style>
  .container {
    display: grid;
    grid-template-rows: auto 1fr;
    grid-template-columns: 1fr;
    row-gap: 24px;
  }

  .section-group {
    display: grid;
    grid-auto-flow: row;
    row-gap: 16px;
  }

  .section-label {
    display: grid;
    grid-template-columns: auto auto;
    align-items: center;
    justify-content: start;
    column-gap: 8px;
  }

  .list {
    display: grid;
    grid-auto-flow: row;
    row-gap: 16px;
  }
</style>
