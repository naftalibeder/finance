<script lang="ts">
  import { Bank, BankCreds } from "shared";
  import { onMount } from "svelte";
  import Icon from "./Icon.svelte";

  export let banks: Bank[];
  export let initialBankId: string;
  export let credsExist: boolean;
  export let onSubmit: (creds: BankCreds) => Promise<void>;

  let bankId: string | undefined;
  let bankUsername = "";
  let bankPassword = "";
  let isSubmitting = false;

  $: bank = banks.find((o) => o.id === bankId);

  onMount(() => {
    bankId = initialBankId;
  });

  const onClickSubmit = async () => {
    if (bankUsername === "" || bankPassword === "") {
      return;
    }

    isSubmitting = true;

    await onSubmit({
      username: bankUsername,
      password: bankPassword,
    });

    bankUsername = "";
    bankPassword = "";
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

    <label for="bank-username">Username</label>
    <input
      type="email"
      id={"bank-username"}
      placeholder={credsExist ? "************" : "Enter username"}
      bind:value={bankUsername}
    />

    <label for="bank-password">Password</label>
    <input
      type="password"
      id={"bank-password"}
      placeholder={credsExist ? "************" : "Enter password"}
      bind:value={bankPassword}
    />
  </div>

  <div class="actions">
    {#if !isSubmitting}
      <div class="spin faded">
        <Icon kind={"reload"} size={"small"} />
      </div>
      <div class="faded">Saving</div>
    {:else}
      <button on:click={() => onClickSubmit()}>Save</button>
    {/if}
  </div>
</div>

<style>
  .container {
    display: grid;
    grid-template-columns: 1fr;
  }

  .inputs {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    column-gap: 16px;
    row-gap: 8px;
  }

  .actions {
    display: grid;
    grid-auto-flow: column;
    column-gap: 8px;
    justify-content: end;
    margin-top: 16px;
  }
</style>
