<script lang="ts">
  import { Account, Bank, BankCreds } from "shared";
  import { titleCase } from "../utils";

  export let account: Account;
  export let banks: Bank[];
  export let onSubmitAccount: (account: Account) => Promise<void>;
  export let onSubmitBankCreds: (
    bankId: string,
    creds: BankCreds
  ) => Promise<void>;

  $: currentBank = banks.find((o) => o.id === account.bankId);

  let bankUsername = "";
  let bankPassword = "";

  const elemId = (key: keyof Account) => {
    return `${account._id}-${key}`;
  };

  const onChangeProperty = (key: keyof Account, value: string) => {
    const updated: Account = {
      ...account,
      [key]: value,
    };
    onSubmitAccount(updated);
  };

  const types: Account["type"][] = [
    "assets",
    "liabilities",
    "equity",
    "revenue",
    "expenses",
  ];
</script>

<div class="container">
  <h2>{account.display}</h2>

  <h3>Account info</h3>
  <div class="inputs">
    <label for={elemId("display")}>Display</label>
    <input
      id={elemId("display")}
      placeholder={"Enter display name"}
      value={account.display}
      on:change={(evt) => {
        onChangeProperty("display", evt.target["value"]);
      }}
    />
    <label for={elemId("number")}>Number</label>
    <input
      id={elemId("number")}
      placeholder={"Enter account number"}
      value={account.number}
      on:change={(evt) => {
        onChangeProperty("number", evt.target["value"]);
      }}
    />
    <label for={elemId("bankId")}>Bank</label>
    <select
      id={elemId("bankId")}
      value={currentBank.id}
      on:change={(evt) => {
        onChangeProperty("bankId", evt.target["value"]);
      }}
    >
      {#each banks as bank}
        <option value={bank.id}>{bank.displayName}</option>
      {/each}
    </select>
    <label for={elemId("kind")}>Kind</label>
    <select
      id={elemId("kind")}
      value={account.kind}
      on:change={(evt) => {
        onChangeProperty("kind", evt.target["value"]);
      }}
    >
      {#each currentBank.supportedAccountKinds as kind}
        <option value={kind}>{titleCase(kind)}</option>
      {/each}
    </select>
    <label for={elemId("type")}>Type</label>
    <select
      id={elemId("type")}
      value={account.type}
      on:change={(evt) => {
        onChangeProperty("type", evt.target["value"]);
      }}
    >
      {#each types as type}
        <option value={type}>{titleCase(type)}</option>
      {/each}
    </select>
  </div>

  <div class="section">
    <h3>{currentBank?.displayNameShort ?? "Bank"} credentials</h3>
    <button
      on:click={async () => {
        await onSubmitBankCreds(account.bankId, {
          username: bankUsername,
          password: bankPassword,
        });
        bankUsername = "";
        bankPassword = "";
      }}>Save</button
    >
  </div>
  <div class="inputs">
    <label for="bank-username">Username</label>
    <input
      type="email"
      id={"bank-username"}
      placeholder={"************"}
      bind:value={bankUsername}
    />
    <label for="bank-password">Password</label>
    <input
      type="password"
      id={"bank-password"}
      placeholder={"************"}
      bind:value={bankPassword}
    />
  </div>
</div>

<style>
  .container {
    display: grid;
    grid-template-columns: 1fr;
    row-gap: 24px;
    padding: 36px;
  }

  .section {
    display: grid;
    grid-template-columns: 1fr auto;
  }

  .inputs {
    display: grid;
    grid-template-columns: auto 3fr;
    align-items: center;
    column-gap: 24px;
    row-gap: 16px;
    text-align: left;
  }
</style>
