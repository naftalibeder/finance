<script lang="ts">
  import { Bank, BankCreds } from "shared";
  import { onMount } from "svelte";
  import { Icon } from ".";

  export let banks: Bank[];
  export let initialBankId: string;
  export let credsExist: boolean;
  export let onClickSubmit: (creds: BankCreds) => Promise<void>;

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
      await onClickSubmit({
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
  <h4>{bank ? bank.displayName : "Bank not chosen"}</h4>

  <div class="inputs">
    <label for="bank">Bank</label>
    <select
      id={"bank"}
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

    <label for="bank-username">Credentials</label>
    {#if isEditing}
      <div class="creds-row">
        <input
          type="email"
          id={"bank-username"}
          placeholder={"Username"}
          bind:value={bankUsername}
        />
        <input
          type="password"
          id={"bank-password"}
          placeholder={"Password"}
          bind:value={bankPassword}
        />
        <div class="actions">
          {#if isSubmitting}
            <div class="spin">
              <Icon kind={"reload"} size={"small"} />
            </div>
          {:else}
            {#if credsExist}
              <button on:click={() => (isEditing = false)}>Cancel</button>
            {/if}
            <button on:click={() => _onClickSubmit()}>Submit</button>
          {/if}
        </div>
      </div>
    {:else}
      <div class="creds-row">
        <input
          class="input-button faded"
          value="****************"
          on:click={() => (isEditing = true)}
        />
        <input
          class="input-button faded"
          value="****************"
          on:click={() => (isEditing = true)}
        />
        <div>
          <button on:click={() => (isEditing = true)}>Change</button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .container {
    display: grid;
    grid-template-columns: 1fr;
    row-gap: 8px;
  }

  .inputs {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    column-gap: 16px;
    row-gap: 8px;
  }

  .creds-row {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    align-items: center;
    column-gap: 8px;
  }

  .input-button {
    outline: 0px;
  }

  .actions {
    display: grid;
    grid-auto-flow: column;
    align-items: center;
    column-gap: 8px;
  }
</style>
