<script lang="ts">
  import { Account } from "shared";

  export let account: Account;
  export let onSubmit: (account: Account) => void;

  const onChangeProperty = (key: keyof Account, value: string) => {
    const updated: Account = {
      ...account,
      [key]: value,
    };
    onSubmit(updated);
  };

  const elemId = (key: keyof Account) => {
    return `${account._id}-${key}`;
  };
</script>

<div class="container">
  <h1 class="title">{account.display}</h1>
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
    <input
      id={elemId("bankId")}
      placeholder={"Enter bank identifier"}
      value={account.bankId}
      on:change={(evt) => {
        onChangeProperty("bankId", evt.target["value"]);
      }}
    />
    <label for={elemId("kind")}>Kind</label>
    <select
      id={elemId("kind")}
      placeholder={"Enter account kind"}
      value={account.kind}
      on:change={(evt) => {
        onChangeProperty("kind", evt.target["value"]);
      }}
    >
      <option value="checking">Checking</option>
      <option value="savings">Savings</option>
      <option value="brokerage">Brokerage</option>
      <option value="credit">Credit</option>
      <option value="debit">Debit</option>
    </select>
    <label for={elemId("type")}>Type</label>
    <select
      id={elemId("type")}
      placeholder={"Enter account type"}
      value={account.type}
      on:change={(evt) => {
        onChangeProperty("type", evt.target["value"]);
      }}
    >
      <option value="assets">Assets</option>
      <option value="liabilities">Liabilities</option>
      <option value="equity">Equity</option>
      <option value="revenue">Revenue</option>
      <option value="expenses">Expenses</option>
    </select>
  </div>
</div>

<style>
  .container {
    display: grid;
    grid-template-columns: 1fr;
    row-gap: 24px;
    padding: 24x;
    cursor: default;
  }

  .title {
    text-align: left;
  }

  .inputs {
    display: grid;
    grid-template-columns: auto 3fr;
    align-items: center;
    column-gap: 16px;
    row-gap: 16px;
    text-align: left;
  }
</style>
