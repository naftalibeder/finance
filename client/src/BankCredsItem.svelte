<script lang="ts">
  import { Bank, BankCreds } from "shared";
  import { onMount } from "svelte";
  import { Icon } from ".";

  export let banks: Bank[];
  export let initialBankId: string;
  export let credsExist: boolean;
  export let onClickCancelNew: () => Promise<void>;
  export let onClickSubmit: (bankId: string, creds: BankCreds) => Promise<void>;
  export let onClickDelete: (bankId: string) => Promise<void>;

  let bankId: string | undefined;
  let bankUsername = "";
  let bankPassword = "";
  let isEditing = false;
  let isSubmitting = false;

  $: bank = banks.find((o) => o.id === bankId);

  onMount(() => {
    bankId = initialBankId;
    if (!credsExist) {
      isEditing = true;
    }
  });

  const _onClickSubmit = async () => {
    if (bankUsername === "" || bankPassword === "") {
      return;
    }

    isSubmitting = true;

    try {
      await onClickSubmit(bankId, {
        username: bankUsername,
        password: bankPassword,
      });
    } catch (e) {
      console.log("Error updating bank credentials:", e);
      isSubmitting = false;
      return;
    }

    bankUsername = "";
    bankPassword = "";
    isEditing = false;
    isSubmitting = false;
  };
</script>

<div class="container">
  <div class="section">
    {#if bank}
      <div>{bank.displayName}</div>
    {:else}
      <div class="faded">{"New bank"}</div>
    {/if}

    <div class="actions">
      {#if isSubmitting}
        <div class="spin">
          <Icon kind={"reload"} size={"small"} />
        </div>
      {:else if isEditing}
        <button
          on:click={() => {
            if (credsExist) {
              isEditing = false;
            } else {
              onClickCancelNew();
            }
          }}
        >
          Cancel
        </button>
        <button on:click={() => _onClickSubmit()}>Submit</button>
      {:else}
        <button on:click={() => (isEditing = true)}>Change</button>
        <button class="destructive" on:click={() => onClickDelete(bankId)}>
          Delete
        </button>
      {/if}
    </div>
  </div>

  {#if isEditing}
    <div class="edit-group">
      <select
        class={bankId ? "" : "faded-text"}
        value={bankId ?? ""}
        on:change={(evt) => {
          bankId = evt.target["value"];
        }}
      >
        <option value="">Select one</option>
        {#each banks as bank}
          <option value={bank.id}>{bank.displayName}</option>
        {/each}
      </select>

      <div class="creds-row">
        <input
          type="email"
          placeholder={"Username"}
          bind:value={bankUsername}
        />
        <input
          type="password"
          placeholder={"Password"}
          bind:value={bankPassword}
        />
      </div>
    </div>
  {/if}
</div>

<style>
  .container {
    display: grid;
    grid-template-columns: 1fr;
    row-gap: 8px;
  }

  .section {
    display: grid;
    grid-template-columns: 1fr auto;
    row-gap: 8px;
  }

  .edit-group {
    display: grid;
    align-items: center;
    column-gap: 16px;
    row-gap: 8px;
    padding-top: 8px;
    padding-bottom: 16px;
  }

  .creds-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    column-gap: 8px;
  }

  .actions {
    display: grid;
    grid-auto-flow: column;
    align-items: center;
    column-gap: 16px;
  }
</style>
