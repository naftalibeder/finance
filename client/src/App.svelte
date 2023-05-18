<script lang="ts">
  import { onMount } from "svelte";
  import {
    Account,
    ProgressUpdate,
    ConfigBankId,
    MfaInfo,
    Transaction,
    // TODO: Fix this error if possible.
    // @ts-ignore
  } from "shared";

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
        method: "GET",
      });
      mfaInfos = await mfaInfosRes.json();
    } catch (e) {
      console.log(e);
    }
  };

  const onClickExtract = async () => {
    try {
      const res = await fetch(`${serverUrl}/extract`, {
        method: "POST",
      });
      let reader = res.body.getReader();

      let result: ReadableStreamReadResult<Uint8Array>;
      let decoder = new TextDecoder("utf8");

      while (!result?.done) {
        result = await reader.read();
        const chunkStr = decoder.decode(result.value);
        console.log(`Received chunk: ${chunkStr}`);

        const chunk: ProgressUpdate = JSON.parse(chunkStr);
        extractStatus = chunk.status;
        if (chunk.status === "wait-for-mfa") {
          await fetchAll();
        }
      }

      extractStatus = "";
    } catch (e) {
      console.log(`Extraction error: ${e}`);
    }
  };

  const onClickSendCode = async (bankId: ConfigBankId, code: string) => {
    const data = {
      bankId,
      code,
    };
    const res = await fetch(`${serverUrl}/mfa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(data).toString(),
    });
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
      <div class="row">
        <p><b>Code needed</b></p>
      </div>
      {#each mfaInfos as mfaInfo}
        <div class="row">
          <label for={mfaInfo.bankId}>{mfaInfo.bankId}</label>
          <input id={mfaInfo.bankId} placeholder="Enter code" />
          <button
            on:click={(evt) => {
              // @ts-ignore
              const code = document.getElementById(mfaInfo.bankId).value;
              onClickSendCode(mfaInfo.bankId, code);
            }}
          >
            Send code
          </button>
        </div>
      {/each}
    </div>
  {/if}

  <div class="section">
    <div class="row">
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
    <div class="row">
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

  .row {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .currency {
    text-align: right;
  }
</style>
