<script lang="ts">
  import { onMount } from "svelte";
  // TODO: Fix this error if possible.
  // @ts-ignore
  import { Account, BufferChunk, MfaInfo, Transaction } from "shared";

  const serverUrl = import.meta.env.VITE_SERVER_URL;

  let accounts: Account[] = [];
  let transactions: Transaction[] = [];
  let mfaInfos: MfaInfo[] = [];

  let extractStatus: string = "";

  onMount(async () => {
    await fetchAll();
  });

  const fetchAll = async () => {
    try {
      const accountsRes = await fetch(`${serverUrl}/accounts`, {
        method: "POST",
      });
      accounts = await accountsRes.json();

      const transactionsRes = await fetch(`${serverUrl}/transactions`, {
        method: "POST",
      });
      transactions = await transactionsRes.json();

      const mfaInfosRes = await fetch(`${serverUrl}/mfa`, {
        method: "POST",
      });
      mfaInfos = await mfaInfosRes.json();
    } catch (e) {
      console.log(e);
    }
  };

  const onClickExtract = async () => {
    const res = await fetch(`${serverUrl}/extract`, {
      method: "POST",
    });
    let reader = res.body.getReader();

    let result: ReadableStreamReadResult<Uint8Array>;
    let decoder = new TextDecoder("utf8");

    while (!result?.done) {
      result = await reader.read();
      const chunkStr = decoder.decode(result.value);
      const chunk: BufferChunk = JSON.parse(chunkStr);

      extractStatus = chunk.message;
      if (chunk.needsCheck) {
        await fetchAll();
      }
    }

    extractStatus = "";
  };

  const formatCurrency = (a: any) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: a.currency,
    }).format(a.amount);
  };
</script>

<div class="container">
  <h1>Transactions</h1>

  {#if mfaInfos.length > 0}
    <div class="section">
      <div class="section-row">
        <p><b>Code needed</b></p>
      </div>
      {#each mfaInfos as mfaInfo}
        <label for={mfaInfo.bankId}>{mfaInfo.bankId}</label>
        <input id={mfaInfo.bankId} placeholder="Enter code" />
      {/each}
    </div>
  {/if}

  <div class="section">
    <div class="section-row">
      <p><b>{accounts.length} accounts</b></p>
      {#if extractStatus === ""}
        <button class="text" on:click={() => onClickExtract()}>
          Refresh all
        </button>
      {:else}
        <div class="faded">{extractStatus}</div>
      {/if}
    </div>
    <table>
      {#each accounts as a}
        <tr>
          <td>{a.id}</td>
          <td class="currency">{formatCurrency(a.price)}</td>
        </tr>
      {/each}
    </table>
  </div>

  <div class="section">
    <div class="section-row">
      <p><b>{transactions.length} transactions</b></p>
    </div>
    <table>
      {#each transactions as t}
        <tr>
          <td>{t.date}</td>
          <td>{t.accountId}</td>
          <td>{t.payee}</td>
          <td class="currency">{formatCurrency(t.price)}</td>
        </tr>
      {/each}
    </table>
  </div>
</div>

<style>
  table {
    width: 100%;
  }

  tr:hover {
    opacity: 0.6;
  }

  td {
    padding-top: 2px;
    padding-bottom: 2px;
  }

  .container {
    display: flex;
    flex-direction: column;
    row-gap: 48px;
  }

  .section {
    display: flex;
    flex-direction: column;
    row-gap: 32px;
  }

  .section-row {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
  }

  .currency {
    text-align: right;
  }
</style>
