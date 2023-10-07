<script lang="ts">
  import { Bank, BankCreds } from "shared";
  import { BankCredsItem } from ".";

  export let banks: Bank[];
  export let bankCredsExistMap: Record<string, boolean>;
  export let onSubmitBankCreds: (
    bankId: string,
    creds: BankCreds
  ) => Promise<void>;

  $: bankCredsItems = Object.entries(bankCredsExistMap).map(
    ([bankId, exists]) => {
      return {
        bankId,
        exists,
      };
    }
  );
</script>

<div class="container">
  <h3>Bank credentials</h3>
  <div class="list">
    {#each bankCredsItems as item}
      <BankCredsItem
        {banks}
        initialBankId={item.bankId}
        credsExist={item.exists}
        onSubmit={async (creds) => {
          await onSubmitBankCreds(item.bankId, creds);
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

  .list {
    display: grid;
    row-gap: 8px;
  }
</style>
