<script lang="ts">
  import { UUID } from "crypto";
  import { Account, Bank } from "shared";
  import { titleCase } from "../utils";

  export let account: Account;
  export let banks: Bank[];
  export let onSubmitAccount: (account: Account) => Promise<void>;
  export let onSelectDeleteAccount: (accountId: UUID) => Promise<void>;

  $: currentBank = banks.find((o) => o.id === account.bankId);
  $: kindIsDisabled =
    !currentBank || currentBank.supportedAccountKinds.length === 0;

  let deleteClickCt = 0;
  const deleteConfirmClickCt = 5;

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
  <div class="scroll">
    <div class="sections">
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
          class={!currentBank ? "faded-text" : ""}
          value={currentBank?.id ?? ""}
          on:change={(evt) => {
            onChangeProperty("bankId", evt.target["value"]);
          }}
        >
          <option value="">Select one</option>
          {#each banks as bank}
            <option value={bank.id}>{bank.displayName}</option>
          {/each}
        </select>
        <label for={elemId("kind")}>Kind</label>
        <select
          id={elemId("kind")}
          class={kindIsDisabled || account.kind === "unselected"
            ? "faded-text"
            : ""}
          value={kindIsDisabled ? "unselected" : account.kind}
          disabled={kindIsDisabled}
          on:change={(evt) => {
            onChangeProperty("kind", evt.target["value"]);
          }}
        >
          <option value="unselected">
            {currentBank ? "Select one" : "No account kinds found for bank"}
          </option>
          {#if currentBank}
            {#each currentBank.supportedAccountKinds as kind}
              <option value={kind}>{titleCase(kind)}</option>
            {/each}
          {/if}
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

      <div class="delete">
        <button
          class="destructive"
          on:click={async () => {
            deleteClickCt += 1;
            if (deleteClickCt === deleteConfirmClickCt) {
              await onSelectDeleteAccount(account._id);
            }
          }}
        >
          {#if deleteClickCt > 0}
            Delete account (Clicked {deleteClickCt}/{deleteConfirmClickCt})
          {:else}
            Delete account
          {/if}
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .container {
    display: grid;
    grid-template-columns: 1fr;
  }

  .scroll {
    display: grid;
    grid-template-columns: 1fr;
  }

  .sections {
    display: grid;
    row-gap: 32px;
  }

  .inputs {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: repeat(5, auto);
    column-gap: 32px;
    row-gap: 16px;
    align-items: center;
    text-align: left;
  }

  .delete {
    display: grid;
    justify-content: end;
  }

  select.faded-text {
    color: var(--text-gray-600);
  }
</style>
